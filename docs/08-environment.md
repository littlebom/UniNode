# 08 — Environment Variables

> ห้าม commit ไฟล์ .env ลง git
> ใช้ .env.example แทน แล้ว copy เป็น .env ก่อนรัน
> Secret จริงต้องเก็บใน HashiCorp Vault เท่านั้น

---

## apps/uni-registry/.env.example

```env
# ── Application ──────────────────────────────────────────
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# ── Database (PostgreSQL) ─────────────────────────────────
DATABASE_URL=postgresql://uniregistry:password@localhost:5432/uniregistry
DATABASE_SSL=false
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# ── TimescaleDB (Audit Logs) ──────────────────────────────
TIMESCALE_URL=postgresql://uniregistry:password@localhost:5433/uniregistry_audit

# ── Redis ─────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# ── Authentik (IdP) ───────────────────────────────────────
AUTHENTIK_URL=https://auth.unilink.ac.th
AUTHENTIK_CLIENT_ID=uni-registry
AUTHENTIK_CLIENT_SECRET=your-client-secret-here
AUTHENTIK_REDIRECT_URI=https://registry.unilink.ac.th/auth/callback

# ── JWT ───────────────────────────────────────────────────
JWT_SECRET=your-jwt-secret-min-64-chars-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# ── mTLS (Node Authentication) ────────────────────────────
MTLS_CA_CERT_PATH=/etc/unilink/ca/ca.crt
MTLS_SERVER_CERT_PATH=/etc/unilink/certs/registry.crt
MTLS_SERVER_KEY_PATH=/etc/unilink/certs/registry.key
MTLS_REQUIRED=true

# ── HashiCorp Vault ───────────────────────────────────────
VAULT_URL=https://vault.unilink.ac.th
VAULT_TOKEN=your-vault-token-here
VAULT_NAMESPACE=unilink/registry

# ── Firebase Cloud Messaging (FCM) ───────────────────────
FCM_PROJECT_ID=unilink-firebase-project
FCM_PRIVATE_KEY_PATH=/etc/unilink/firebase/service-account.json

# ── Consortium Settings ───────────────────────────────────
CONSORTIUM_NAME=UniLink Thailand Consortium
REGISTRY_DID=did:web:registry.unilink.ac.th
REGISTRY_DOMAIN=registry.unilink.ac.th

# ── BullMQ (Queue) ────────────────────────────────────────
QUEUE_AGGREGATE_CONCURRENCY=5
QUEUE_NOTIFICATION_CONCURRENCY=10

# ── Monitoring ────────────────────────────────────────────
GRAFANA_URL=https://grafana.unilink.ac.th
PROMETHEUS_PORT=9090

# ── Rate Limiting ─────────────────────────────────────────
RATE_LIMIT_TTL=60          # seconds
RATE_LIMIT_MAX=100         # requests per TTL

# ── CORS ──────────────────────────────────────────────────
CORS_ORIGINS=https://registry.unilink.ac.th,https://admin.unilink.ac.th

# ── Logging ───────────────────────────────────────────────
LOG_LEVEL=info             # debug | info | warn | error
LOG_FORMAT=json            # json | pretty (dev)
```

---

## apps/uni-node/.env.example

```env
# ── Application ──────────────────────────────────────────
NODE_ENV=development
PORT=3000
API_PREFIX=unilink/api/v1

# ── University Identity ───────────────────────────────────
NODE_ID=tu.ac.th
NODE_NAME=มหาวิทยาลัยธรรมศาสตร์
NODE_NAME_EN=Thammasat University
NODE_DID=did:web:tu.ac.th
NODE_DOMAIN=tu.ac.th

# ── Registry Connection ───────────────────────────────────
REGISTRY_URL=https://registry.unilink.ac.th/api/v1
REGISTRY_NODE_JWT=your-node-jwt-issued-by-registry
MTLS_CLIENT_CERT_PATH=/etc/unilink/certs/tu-ac-th.crt
MTLS_CLIENT_KEY_PATH=/etc/unilink/certs/tu-ac-th.key
MTLS_CA_CERT_PATH=/etc/unilink/ca/ca.crt

# ── Database (PostgreSQL) ─────────────────────────────────
DATABASE_URL=postgresql://uninode:password@localhost:5432/uninode_tu
DATABASE_SSL=false
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# ── TimescaleDB (Audit Logs) ──────────────────────────────
TIMESCALE_URL=postgresql://uninode:password@localhost:5433/uninode_tu_audit

# ── Redis ─────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=1

# ── HashiCorp Vault ───────────────────────────────────────
VAULT_URL=https://vault.tu.ac.th
VAULT_TOKEN=your-vault-token-here
VAULT_SIGNING_KEY_PATH=secret/unilink/tu-ac-th/signing-key
VAULT_MOUNT_PATH=transit

# ── Authentik (IdP) ───────────────────────────────────────
AUTHENTIK_URL=https://auth.unilink.ac.th
AUTHENTIK_CLIENT_ID=uni-node-tu
AUTHENTIK_CLIENT_SECRET=your-client-secret-here
AUTHENTIK_REDIRECT_URI=https://tu.ac.th/unilink/auth/callback

# ── JWT ───────────────────────────────────────────────────
JWT_SECRET=your-jwt-secret-min-64-chars-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# ── SIS Integration ───────────────────────────────────────
SIS_WEBHOOK_SECRET=your-sis-webhook-secret-here
SIS_API_URL=https://sis.tu.ac.th/api
SIS_API_KEY=your-sis-api-key-here

# ── DID Settings ─────────────────────────────────────────
DID_DOCUMENT_PATH=/.well-known/did.json
STATUS_LIST_PATH=/.well-known/status-list
STATUS_LIST_SIZE=131072    # จำนวน VC ที่รองรับต่อ List

# ── Course Catalog ────────────────────────────────────────
COURSE_CATALOG_CACHE_TTL=3600    # seconds (1 ชั่วโมง)
COURSE_CATALOG_SIGN_RESPONSES=true

# ── Firebase Cloud Messaging ─────────────────────────────
FCM_PROJECT_ID=unilink-firebase-project
FCM_PRIVATE_KEY_PATH=/etc/unilink/firebase/service-account.json

# ── Aggregate Sync ────────────────────────────────────────
AGGREGATE_SYNC_CRON=0 2 * * *    # ทุกคืน 02:00 น.
AGGREGATE_SYNC_ENABLED=true

# ── Rate Limiting ─────────────────────────────────────────
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=200

# ── CORS ──────────────────────────────────────────────────
CORS_ORIGINS=https://tu.ac.th,https://node-portal.tu.ac.th

# ── Logging ───────────────────────────────────────────────
LOG_LEVEL=info
LOG_FORMAT=json

# ── RFC 3161 Timestamp ────────────────────────────────────
TSA_URL=https://freetsa.org/tsr
TSA_ENABLED=true
```

---

## apps/uni-node-portal/.env.example

```env
# ── Next.js ───────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME=UniLink Admin Portal
NEXT_PUBLIC_NODE_ID=tu.ac.th
NEXT_PUBLIC_NODE_NAME=มหาวิทยาลัยธรรมศาสตร์

# ── API Connection ────────────────────────────────────────
NEXT_PUBLIC_NODE_API_URL=https://tu.ac.th/unilink/api/v1
NEXT_PUBLIC_REGISTRY_URL=https://registry.unilink.ac.th/api/v1

# ── Authentik (Auth) ──────────────────────────────────────
NEXTAUTH_URL=https://node-portal.tu.ac.th
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars
AUTHENTIK_CLIENT_ID=uni-node-portal-tu
AUTHENTIK_CLIENT_SECRET=your-client-secret-here
AUTHENTIK_ISSUER=https://auth.unilink.ac.th/application/o/uni-node-portal-tu/

# ── Session ───────────────────────────────────────────────
SESSION_MAX_AGE=28800      # 8 ชั่วโมง (seconds)

# ── Feature Flags ─────────────────────────────────────────
NEXT_PUBLIC_ENABLE_EXTERNAL_CREDENTIAL=true
NEXT_PUBLIC_ENABLE_BULK_IMPORT=false
```

---

## apps/uni-wallet/.env.example

```env
# ── Expo / App Config ─────────────────────────────────────
EXPO_PUBLIC_APP_NAME=UniWallet
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENV=development

# ── API Endpoints ─────────────────────────────────────────
# Node URL จะถูก Set ตอน Login (ตาม Student ID)
EXPO_PUBLIC_REGISTRY_URL=https://registry.unilink.ac.th/api/v1
EXPO_PUBLIC_DEFAULT_NODE_URL=https://tu.ac.th/unilink/api/v1

# ── Firebase ──────────────────────────────────────────────
EXPO_PUBLIC_FCM_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_PROJECT_ID=unilink-firebase-project
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:android:abcdef

# ── Feature Flags ─────────────────────────────────────────
EXPO_PUBLIC_ENABLE_QR_SHARE=true
EXPO_PUBLIC_ENABLE_BIOMETRIC=true
EXPO_PUBLIC_ENABLE_BACKUP=true
EXPO_PUBLIC_ENABLE_WEB_FALLBACK=true

# ── Security ──────────────────────────────────────────────
EXPO_PUBLIC_PIN_MIN_LENGTH=6
EXPO_PUBLIC_SESSION_TIMEOUT=900    # 15 นาที (seconds)
EXPO_PUBLIC_MAX_PIN_ATTEMPTS=5

# ── Misc ──────────────────────────────────────────────────
EXPO_PUBLIC_SUPPORT_EMAIL=support@unilink.ac.th
EXPO_PUBLIC_TERMS_URL=https://unilink.ac.th/terms
EXPO_PUBLIC_PRIVACY_URL=https://unilink.ac.th/privacy
```

---

## Docker Compose Environment (dev)

```yaml
# docker-compose.yml
services:
  postgres-registry:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_USER: uniregistry
      POSTGRES_PASSWORD: password
      POSTGRES_DB: uniregistry
    ports:
      - "5432:5432"

  postgres-node:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_USER: uninode
      POSTGRES_PASSWORD: password
      POSTGRES_DB: uninode_tu
    ports:
      - "5433:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  authentik-postgresql:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: authentik
      POSTGRES_PASSWORD: authentik-password
      POSTGRES_DB: authentik

  authentik-redis:
    image: redis:alpine

  authentik-server:
    image: ghcr.io/goauthentik/server:latest
    command: server
    environment:
      AUTHENTIK_REDIS__HOST: authentik-redis
      AUTHENTIK_POSTGRESQL__HOST: authentik-postgresql
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: authentik-password
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_SECRET_KEY: your-authentik-secret-key
    ports:
      - "9000:9000"
      - "9443:9443"

  authentik-worker:
    image: ghcr.io/goauthentik/server:latest
    command: worker
    environment:
      AUTHENTIK_REDIS__HOST: authentik-redis
      AUTHENTIK_POSTGRESQL__HOST: authentik-postgresql
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: authentik-password
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_SECRET_KEY: your-authentik-secret-key

  vault:
    image: hashicorp/vault:latest
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: dev-root-token
      VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
    ports:
      - "8200:8200"
    cap_add:
      - IPC_LOCK
```

---

## Kubernetes Secrets (Production)

```yaml
# ห้ามใส่ค่าจริง — ใช้ External Secrets Operator ดึงจาก Vault
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: uni-registry-secrets
spec:
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: uni-registry-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: secret/unilink/registry
        property: database_url
    - secretKey: JWT_SECRET
      remoteRef:
        key: secret/unilink/registry
        property: jwt_secret
    - secretKey: AUTHENTIK_CLIENT_SECRET
      remoteRef:
        key: secret/unilink/registry
        property: authentik_client_secret
```
