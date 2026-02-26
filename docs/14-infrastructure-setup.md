# 14 — Infrastructure Setup Guide

> เอกสารนี้ให้ Claude Code รู้ขั้นตอนการตั้งค่า Infrastructure ที่ต้องทำก่อนพัฒนา
> ทำครั้งเดียวต่อ Environment (dev / staging / prod)

---

## 1. HashiCorp Vault — Transit Engine (Key Management)

Vault ใช้สำหรับเก็บ Ed25519 Private Key ของมหาวิทยาลัย และ Sign VC โดยที่ raw key ไม่เคยออกจาก Vault

### 1.1 Init & Unseal (Production)
```bash
# Start Vault (Production — ไม่ใช่ dev mode)
vault server -config=/etc/vault/config.hcl

# Init — ได้ unseal keys และ root token
vault operator init -key-shares=5 -key-threshold=3

# Unseal (ต้อง 3 จาก 5 keys)
vault operator unseal <key-1>
vault operator unseal <key-2>
vault operator unseal <key-3>

# Login ด้วย root token (แค่ครั้งแรก)
vault login <root-token>
```

### 1.2 Enable Transit Engine
```bash
# Enable Transit Engine (สำหรับ Sign/Verify)
vault secrets enable transit

# Enable KV v2 (สำหรับเก็บ metadata)
vault secrets enable -version=2 -path=secret kv
```

### 1.3 สร้าง Signing Key สำหรับแต่ละมหาวิทยาลัย
```bash
# สร้าง Ed25519 key สำหรับ มธ.
vault write transit/keys/tu-ac-th type=ed25519

# ดู Public Key (นำไปใส่ใน did.json)
vault read transit/keys/tu-ac-th
# ผลลัพธ์จะมี "keys.1.public_key" ซึ่งเป็น Ed25519 public key (base64)

# ทดสอบ Sign
echo -n "test-data" | base64 | vault write transit/sign/tu-ac-th input=-

# ทดสอบ Verify
vault write transit/verify/tu-ac-th \
  input=$(echo -n "test-data" | base64) \
  signature=<signature-from-above>
```

### 1.4 สร้าง Policy สำหรับ uni-node
```bash
# เขียน Policy
cat > /tmp/uni-node-tu-policy.hcl << 'EOF'
# อนุญาตให้ Sign เท่านั้น (ไม่อ่าน raw key ได้)
path "transit/sign/tu-ac-th" {
  capabilities = ["create", "update"]
}

path "transit/verify/tu-ac-th" {
  capabilities = ["create", "update"]
}

path "transit/keys/tu-ac-th" {
  capabilities = ["read"]
}

# KV สำหรับ metadata
path "secret/data/unilink/tu-ac-th/*" {
  capabilities = ["create", "read", "update", "delete"]
}
EOF

vault policy write uni-node-tu /tmp/uni-node-tu-policy.hcl

# สร้าง Token สำหรับ uni-node
vault token create \
  -policy=uni-node-tu \
  -ttl=8760h \
  -renewable=true \
  -display-name="uni-node-tu-ac-th"
# เก็บ token นี้ใส่ ENV: VAULT_TOKEN
```

### 1.5 การใช้ Vault ใน NestJS (packages/crypto/src/vault.ts)
```typescript
import Vault from 'node-vault'

const vault = Vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_URL,
  token: process.env.VAULT_TOKEN,
})

// Sign data ด้วย Vault Transit
export async function vaultSign(
  data: Buffer,
  keyName: string  // 'tu-ac-th'
): Promise<string> {
  const input = data.toString('base64')
  const result = await vault.write(`transit/sign/${keyName}`, {
    input,
    marshaling_algorithm: 'jws',
  })
  return result.data.signature
  // format: "vault:v1:MEUCIQDx..."
}

// Verify signature จาก Vault Transit
export async function vaultVerify(
  data: Buffer,
  signature: string,
  keyName: string
): Promise<boolean> {
  const result = await vault.write(`transit/verify/${keyName}`, {
    input: data.toString('base64'),
    signature,
    marshaling_algorithm: 'jws',
  })
  return result.data.valid
}

// ดึง Public Key จาก Vault
export async function getPublicKey(keyName: string): Promise<string> {
  const result = await vault.read(`transit/keys/${keyName}`)
  // keys.1 คือ version ล่าสุด
  return result.data.keys[1].public_key
}
```

---

## 2. mTLS — Certificate Authority และ Node Certificates

UniRegistry เป็น Root CA ออก Certificate ให้แต่ละ Node สำหรับ mTLS

### 2.1 สร้าง Root CA (ทำที่ UniRegistry Server)
```bash
# สร้าง directory
mkdir -p /etc/unilink/ca
cd /etc/unilink/ca

# Step 1: สร้าง Root CA Private Key
openssl genrsa -aes256 -out ca.key 4096
# ตั้ง passphrase แล้วเก็บไว้ให้ดี

# Step 2: สร้าง Root CA Certificate (valid 10 ปี)
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/C=TH/ST=Bangkok/O=UniLink Consortium/CN=UniLink Root CA"

# ตรวจสอบ
openssl x509 -in ca.crt -text -noout | grep "Subject:\|Not After"
```

### 2.2 สร้าง Certificate สำหรับ UniRegistry Server
```bash
cd /etc/unilink/ca

# สร้าง Registry Server Key
openssl genrsa -out registry.key 2048

# สร้าง CSR
openssl req -new -key registry.key -out registry.csr \
  -subj "/C=TH/ST=Bangkok/O=UniLink Consortium/CN=registry.unilink.ac.th"

# Sign ด้วย CA (valid 1 ปี)
openssl x509 -req -days 365 -in registry.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out registry.crt \
  -extfile <(printf "subjectAltName=DNS:registry.unilink.ac.th\nextendedKeyUsage=serverAuth,clientAuth")

# Copy ไปที่ correct location
cp ca.crt registry.crt registry.key /etc/unilink/certs/
```

### 2.3 สร้าง Certificate สำหรับ Node (ทำทุกครั้งที่ Node ใหม่เข้า)
```bash
# === รันที่ UniRegistry Server ===

# สร้าง Node Key และ Certificate สำหรับ มธ.
NODE_ID="tu.ac.th"
NODE_CN="tu.ac.th"

# Step 1: สร้าง Node Key
openssl genrsa -out node-${NODE_ID}.key 2048

# Step 2: สร้าง CSR
openssl req -new -key node-${NODE_ID}.key -out node-${NODE_ID}.csr \
  -subj "/C=TH/ST=Bangkok/O=Thammasat University/CN=${NODE_CN}"

# Step 3: Sign ด้วย CA
openssl x509 -req -days 365 -in node-${NODE_ID}.csr \
  -CA /etc/unilink/ca/ca.crt \
  -CAkey /etc/unilink/ca/ca.key \
  -CAcreateserial \
  -out node-${NODE_ID}.crt \
  -extfile <(printf "subjectAltName=DNS:${NODE_CN},DNS:${NODE_ID}\nextendedKeyUsage=clientAuth")

# ดู Thumbprint (ลง registry ใน DB)
openssl x509 -in node-${NODE_ID}.crt -fingerprint -sha256 -noout
# sha256 Fingerprint=AB:CD:EF:... → เก็บไว้ใส่ certThumbprint ใน DB

# Step 4: ส่ง Certificate ให้ Node (Secure Channel)
# - node-${NODE_ID}.key  → Node เก็บที่ /etc/unilink/certs/
# - node-${NODE_ID}.crt  → Node เก็บที่ /etc/unilink/certs/
# - ca.crt               → Node เก็บที่ /etc/unilink/ca/
```

### 2.4 NestJS mTLS Setup (uni-node → uni-registry)
```typescript
// apps/uni-node/src/registry/registry.module.ts

import * as https from 'https'
import * as fs from 'fs'
import axios from 'axios'

// HTTP Client ที่ใช้ mTLS
export const registryHttpClient = axios.create({
  baseURL: process.env.REGISTRY_URL,
  httpsAgent: new https.Agent({
    cert: fs.readFileSync(process.env.MTLS_CLIENT_CERT_PATH!),
    key: fs.readFileSync(process.env.MTLS_CLIENT_KEY_PATH!),
    ca: fs.readFileSync(process.env.MTLS_CA_CERT_PATH!),
    rejectUnauthorized: true,
  }),
})
```

### 2.5 NestJS mTLS Server Setup (uni-registry รับ mTLS)
```typescript
// apps/uni-registry/src/main.ts

import * as https from 'https'
import * as fs from 'fs'

async function bootstrap() {
  const httpsOptions = {
    key:  fs.readFileSync(process.env.MTLS_SERVER_KEY_PATH!),
    cert: fs.readFileSync(process.env.MTLS_SERVER_CERT_PATH!),
    ca:   fs.readFileSync(process.env.MTLS_CA_CERT_PATH!),
    requestCert: true,          // ← ขอ Client Certificate
    rejectUnauthorized: false,  // ← false เพราะจะ Check เองใน Guard
  }

  const app = await NestFactory.create(AppModule, { httpsOptions })
  // ...
}

// Guard ตรวจสอบ mTLS Certificate
@Injectable()
export class MTLSGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const cert = req.socket.getPeerCertificate()

    if (!cert || !cert.subject) {
      throw new UnauthorizedException('CLIENT_CERT_REQUIRED')
    }

    // ตรวจสอบ thumbprint กับ DB
    const thumbprint = cert.fingerprint256.replace(/:/g, '').toLowerCase()
    const node = await this.nodeRepository.findByThumbprint(thumbprint)

    if (!node || node.status !== 'active') {
      throw new UnauthorizedException('NODE_CERT_INVALID')
    }

    req['node'] = node  // ส่งต่อ node info ไป controller
    return true
  }
}
```

---

## 3. Nginx — Serve did.json และ Status List

### 3.1 Nginx config สำหรับ did:web
```nginx
# /etc/nginx/sites-available/unilink-node

server {
    listen 443 ssl;
    server_name tu.ac.th;

    ssl_certificate     /etc/ssl/tu.ac.th.crt;
    ssl_certificate_key /etc/ssl/tu.ac.th.key;

    # ── did:web Endpoints (Public — ไม่ต้อง Auth) ──────────────────
    # did.json: https://tu.ac.th/.well-known/did.json
    location /.well-known/did.json {
        proxy_pass http://localhost:3000/.well-known/did.json;
        proxy_set_header Host $host;

        # Headers สำคัญสำหรับ did:web
        add_header Access-Control-Allow-Origin "*";
        add_header Content-Type "application/json";
        add_header Cache-Control "public, max-age=3600";
    }

    # Status List: https://tu.ac.th/.well-known/status-list/1
    location /.well-known/status-list/ {
        proxy_pass http://localhost:3000/.well-known/status-list/;
        proxy_set_header Host $host;
        add_header Access-Control-Allow-Origin "*";
        add_header Content-Type "application/json";
        add_header Cache-Control "public, max-age=300";
    }

    # ── UniLink API (ต้อง Auth) ────────────────────────────────────
    location /unilink/ {
        proxy_pass http://localhost:3000/unilink/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3.2 ทดสอบ did:web Resolution
```bash
# ทดสอบว่า did.json เข้าถึงได้
curl -s https://tu.ac.th/.well-known/did.json | python3 -m json.tool

# ผลที่ต้องได้ — ต้องมี verificationMethod
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:tu.ac.th",
  "verificationMethod": [
    {
      "id": "did:web:tu.ac.th#key-1",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:web:tu.ac.th",
      "publicKeyMultibase": "z6Mk..."
    }
  ]
}

# ทดสอบ DID Resolution ด้วย Veramo
npx ts-node -e "
  import { agent } from './packages/vc-core/src'
  agent.resolveDid({ didUrl: 'did:web:tu.ac.th' }).then(console.log)
"
```

---

## 4. Firebase Cloud Messaging (FCM) Setup

### 4.1 สร้าง Firebase Project
```
1. ไปที่ https://console.firebase.google.com
2. Create Project: "unilink-thailand"
3. เพิ่ม Android App:
   - Package name: "ac.unilink.wallet"
   - ดาวน์โหลด google-services.json → ใส่ที่ apps/uni-wallet/android/app/
4. เพิ่ม iOS App:
   - Bundle ID: "ac.unilink.wallet"
   - ดาวน์โหลด GoogleService-Info.plist → ใส่ที่ apps/uni-wallet/ios/
5. ไปที่ Project Settings → Service Accounts
   - Generate New Private Key → ดาวน์โหลด service-account.json
   - เก็บที่ /etc/unilink/firebase/service-account.json บน Server
```

### 4.2 การส่ง Notification จาก NestJS
```typescript
// apps/uni-node/src/notification/fcm.service.ts

import * as admin from 'firebase-admin'
import * as serviceAccount from '/etc/unilink/firebase/service-account.json'

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
})

@Injectable()
export class FCMService {
  async sendVCIssuedNotification(
    fcmToken: string,
    vcData: { courseName: string; grade: string; issuerName: string }
  ): Promise<void> {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: 'ได้รับหน่วยกิตใหม่ 🎓',
        body: `${vcData.courseName} — เกรด ${vcData.grade}`,
      },
      data: {
        type: 'vc_issued',
        courseName: vcData.courseName,
        grade: vcData.grade,
        issuerName: vcData.issuerName,
      },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    })
  }

  async sendConsentRequestNotification(
    fcmToken: string,
    consent: { consentId: string; requesterName: string; purpose: string }
  ): Promise<void> {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: 'คำขอเข้าถึงข้อมูล',
        body: `${consent.requesterName} ขอดูข้อมูลของคุณ`,
      },
      data: {
        type: 'consent_request',
        consentId: consent.consentId,
        requesterName: consent.requesterName,
        purpose: consent.purpose,
      },
    })
  }
}
```

---

## 5. Dev Environment Quick Start (Sprint 1)

```bash
# ===== ทำครั้งเดียวเพื่อ Setup Dev Environment =====

# 1. Clone และ Setup Monorepo
git clone <repo>
cd unilink
pnpm install

# 2. Copy ENV files
cp apps/uni-registry/.env.example apps/uni-registry/.env
cp apps/uni-node/.env.example      apps/uni-node/.env
cp apps/uni-node-portal/.env.example apps/uni-node-portal/.env
cp apps/uni-wallet/.env.example    apps/uni-wallet/.env

# 3. Start Infrastructure (DB, Redis, Authentik, Vault)
docker compose up -d
echo "รอ 30 วินาทีให้ Services พร้อม..."
sleep 30

# 4. Init Vault (Dev Mode — token คือ "dev-root-token")
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=dev-root-token
vault secrets enable transit
vault secrets enable -version=2 -path=secret kv

# สร้าง Test Signing Key สำหรับ Dev
vault write transit/keys/tu-ac-th type=ed25519
vault write transit/keys/chula-ac-th type=ed25519

# ดึง Public Key สำหรับ dev did.json
VAULT_PUBKEY=$(vault read -field=keys transit/keys/tu-ac-th | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['1']['public_key'])")
echo "TU Public Key: $VAULT_PUBKEY"

# 5. Run Database Migrations
pnpm db:migrate

# 6. Seed Dev Data (สร้าง Test Nodes, Courses, Students)
pnpm db:seed

# 7. Start Dev Servers
pnpm dev
```

---

## 6. Production Security Checklist

```
ก่อน Deploy Production ต้องทำครบทุกข้อ:

Vault:
  ☐ ใช้ Production mode (ไม่ใช่ dev mode)
  ☐ Unseal keys ถูกแจกจ่ายให้ 5 คน (3-of-5 threshold)
  ☐ Root token ถูก Revoke หลัง Setup เสร็จ
  ☐ Auto-unseal ตั้งค่าแล้ว (AWS KMS / GCP KMS)
  ☐ Vault Audit Log เปิดใช้

mTLS:
  ☐ CA Private Key เก็บใน Vault (ไม่ใช่ filesystem)
  ☐ Certificate expiry alert ตั้งค่าแล้ว (แจ้ง 30 วันก่อนหมด)
  ☐ CRL (Certificate Revocation List) มีและอัปเดตได้

Secrets:
  ☐ ไม่มี Secret ใน ENV files (ทุกอย่างดึงจาก Vault)
  ☐ JWT_SECRET มี entropy ≥ 256 bits
  ☐ AUTHENTIK_SECRET_KEY มี entropy ≥ 256 bits

Network:
  ☐ Vault ไม่ expose ออก Public Internet
  ☐ PostgreSQL ไม่ expose ออก Public Internet
  ☐ Redis ไม่ expose ออก Public Internet
  ☐ mTLS endpoint ไม่รับ connection ที่ไม่มี Client Cert

Monitoring:
  ☐ Alert เมื่อ Vault seal
  ☐ Alert เมื่อ Certificate ใกล้หมดอายุ
  ☐ Alert เมื่อ Failed auth rate สูงผิดปกติ
```
