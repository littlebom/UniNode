# 02 — Architecture Decisions (ADRs)

## ADR-001: Federated vs Centralized Architecture

**ตัดสินใจ:** Federated (European EWP Style)

**เหตุผล:**
- มหาวิทยาลัยเป็นเจ้าของข้อมูลนักศึกษาของตัวเอง
- หากระบบกลางล่ม แต่ละ Node ยังทำงานได้
- ลดความเสี่ยง Single Point of Failure
- สอดคล้องกับกฎหมาย PDPA ไทย

**ผลลัพธ์:**
- UniRegistry เป็นแค่ Coordinator ไม่ใช่ Data Store
- ข้อมูลนักศึกษาอยู่ที่ Node ของมหาวิทยาลัยเสมอ
- Student ถือ VC เองใน UniWallet

---

## ADR-002: W3C VC แทน Blockchain

**ตัดสินใจ:** W3C Verifiable Credentials + Ed25519 + did:web

**เหตุผล:**
- ได้ Trust เทียบเท่า Blockchain (Cryptographic Signature)
- ไม่ต้องการ Consensus / Gas Fee
- Setup ง่ายกว่า Hyperledger Fabric มาก
- W3C Standard รองรับ Interoperability สากล
- did:web ใช้ HTTPS domain ที่มีอยู่แล้ว

**ผลลัพธ์:**
- มหาวิทยาลัยแต่ละแห่งมี DID: `did:web:<domain>`
- ตัวอย่าง: `did:web:tu.ac.th`, `did:web:chula.ac.th`
- Public Key เข้าถึงได้ที่ `https://<domain>/.well-known/did.json`
- VC Sign ด้วย Ed25519 Private Key ที่เก็บใน Vault

---

## ADR-003: Authentik เป็น Identity Provider

**ตัดสินใจ:** Authentik (ไม่ใช่ Keycloak)

**เปรียบเทียบ:**

| หัวข้อ | Authentik | Keycloak |
|---|---|---|
| ภาษา | Python/Django | Java |
| Setup | ~3 นาที | หลายชั่วโมง |
| RAM | น้อยกว่า | มากกว่า |
| UI | Modern | เก่ากว่า |
| LDAP | รองรับ | รองรับ |
| Community | เติบโตเร็ว | ใหญ่กว่า |
| Enterprise Support | น้อยกว่า | Red Hat |

**เหตุผล:** ทีม Dev แข็งแกร่ง + Maintenance ง่ายกว่า + เหมาะกับ Consortium ขนาดกลาง

**ผลลัพธ์:**
- Authentik instance เดียวที่ UniRegistry Server
- แต่ละมหาวิทยาลัย Federation LDAP มาที่ Authentik กลาง
- Staff Login ด้วย LDAP credentials ของมหาวิทยาลัยตัวเอง

---

## ADR-004: Hybrid Standards (W3C + 1EdTech)

**ตัดสินใจ:** ใช้ทั้งสอง Standard ในบทบาทที่ต่างกัน

| Layer | Standard | ใช้สำหรับ |
|---|---|---|
| Identity & Trust | W3C DID + VC | ตัวตน, Credential, Signature |
| Course Knowledge | 1EdTech LIS v2.0 | โครงสร้างวิชา |
| Learning Outcomes | 1EdTech CASE v1.1 | LO, Competency |
| External API | schema.org/Course | Web-friendly format |

**เหตุผล:**
- W3C แก้ปัญหา "ของจริงไหม?" → Identity + Trust Layer
- 1EdTech แก้ปัญหา "วิชานี้สอนอะไร?" → Course Knowledge Layer
- ไม่ขัดแย้งกัน ใช้ร่วมกันได้สมบูรณ์
- รองรับ Moodle/Canvas Integration ในอนาคต (รองรับ LIS native)

---

## ADR-005: Node Communication Pattern

**ตัดสินใจ:** ไม่มี Direct Node-to-Node Communication

**Pattern ที่ใช้:**
- **Pattern B:** Registry เก็บ Aggregate (ไม่มี PII) → ใช้สำหรับสถิติ
- **Pattern C:** Student Consent Required → ใช้สำหรับข้อมูลรายบุคคล

**เหตุผล:**
- Privacy-first design
- Node ไม่ต้องรู้จัก endpoint ของ Node อื่น
- ลด Attack Surface
- Audit trail ชัดเจน

**ผลลัพธ์:**
- Node A ต้องการข้อมูล Node B → ขอ Consent ผ่าน Registry
- นักศึกษาอนุมัติ → Registry ออก Token → Node A ใช้ Token ดึงข้อมูล
- Course Detail ดึงโดยตรงจาก Node (Public API ไม่ต้อง Consent)

---

## ADR-006: Course Catalog เป็น Public API

**ตัดสินใจ:** Course Catalog API เป็น Semi-Public (ต้องมี JWT แต่ไม่ต้อง Consent)

**เหตุผล:**
- ข้อมูล Course เป็น Academic Information ไม่ใช่ PII
- มหาวิทยาลัยปลายทางต้องดูข้อมูลวิชาก่อนตัดสินใจโอน
- การใช้ Public ช่วยให้ระบบ Interoperable ได้กว้างขึ้น

**ผลลัพธ์:**
- `GET /courses/{id}` → ต้องมี JWT (Node JWT)
- `GET /courses/{id}/outcomes` → ต้องมี JWT
- Course data ถูก Sign ด้วย Ed25519 เพื่อป้องกันการแก้ไข

---

## ADR-007: Monorepo ด้วย Turborepo + pnpm

**ตัดสินใจ:** Monorepo

**เหตุผล:**
- Share TypeScript types ระหว่าง apps
- Share VC logic (Veramo config) ระหว่าง Node และ Wallet
- Atomic commits ครอบคลุมทุกระบบ
- ง่ายต่อการ refactor
- Build caching ด้วย Turborepo

---

## Deployment Architecture

### UniRegistry Server
```
┌─────────────────────────────────────────────┐
│  Kubernetes Cluster (UniRegistry)           │
├─────────────────────────────────────────────┤
│  Pod: uni-registry-app    (NestJS :3000)    │
│  Pod: authentik-server    (Python :9000)    │
│  Pod: authentik-worker    (Celery)          │
│  Pod: nginx               (Reverse Proxy)   │
│  StatefulSet: postgresql  (DB :5432)        │
│  StatefulSet: redis       (Cache :6379)     │
│  StatefulSet: vault       (Secrets :8200)   │
└─────────────────────────────────────────────┘
```

### UniLink Node Server (แต่ละมหาวิทยาลัย)
```
┌─────────────────────────────────────────────┐
│  Kubernetes Cluster (มหาวิทยาลัย)          │
├─────────────────────────────────────────────┤
│  Pod: uni-node-app        (NestJS :3000)    │
│  Pod: uni-node-portal     (Next.js :3001)   │
│  Pod: nginx               (Reverse Proxy)   │
│  StatefulSet: postgresql  (DB :5432)        │
│  StatefulSet: timescaledb (Audit :5433)     │
│  StatefulSet: redis       (Cache :6379)     │
│  StatefulSet: vault       (Secrets :8200)   │
└─────────────────────────────────────────────┘
```

---

## Security Architecture

### Key Management
```
Private Key (Ed25519)
└── เก็บใน HashiCorp Vault
    ├── Transit Secrets Engine (sign operation)
    └── ไม่มีใครเห็น raw key — ใช้ API sign เท่านั้น

Public Key
└── เผยแพร่ที่ did.json (HTTPS public)
    └── https://<domain>/.well-known/did.json
```

### Authentication Flow
```
Staff Login:
Browser → Authentik → LDAP (มหาวิทยาลัย) → JWT → Portal

Node-to-Registry:
Node → mTLS Certificate (ออกโดย Registry CA) → Registry

Student:
UniWallet → JWT → Node/Registry
         → Biometric PIN → ปลดล็อค Private Key
```

### Trust Chain
```
Root CA (UniRegistry)
├── Intermediate CA
│   ├── Node Certificate (มธ.)
│   ├── Node Certificate (จุฬา)
│   └── Node Certificate (KU)
└── (ใช้สำหรับ mTLS เท่านั้น)

VC Trust:
did:web:tu.ac.th → did.json → Ed25519 Public Key
                              └── ใช้ Verify VC signature
```
