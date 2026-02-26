# UniLink — CLAUDE.md

> **อ่านไฟล์นี้ทุกครั้งก่อนเริ่มทำงาน**
> อ่าน docs/ ที่เกี่ยวข้องกับ Sprint ที่กำลังพัฒนาก่อนเสมอ

---

## โปรเจคนี้คืออะไร

**UniLink** คือระบบ Digital Credit Transfer Network สำหรับกลุ่มมหาวิทยาลัย (Consortium) ในประเทศไทย ใช้ **W3C Verifiable Credentials** และ **1EdTech (IMS Global)** เป็นมาตรฐานหลัก เพื่อให้นักศึกษาโอนหน่วยกิตระหว่างสถาบันได้อย่างปลอดภัย โปร่งใส และตรวจสอบได้ โดยไม่ต้องใช้ Blockchain

---

## 4 ระบบที่ต้องพัฒนา

| App | ประเภท | หน้าที่ |
|---|---|---|
| `apps/uni-registry` | NestJS | Central Registry — Node Directory, Consent, Aggregate |
| `apps/uni-node` | NestJS | ระบบมหาวิทยาลัย — ออก VC, Course Catalog, Transfer |
| `apps/uni-node-portal` | Next.js 15 | Admin Portal สำหรับ Staff มหาวิทยาลัย |
| `apps/uni-wallet` | React Native (Expo) | Digital Wallet สำหรับนักศึกษา |

## 4 Shared Packages

| Package | หน้าที่ |
|---|---|
| `packages/vc-core` | Veramo config, createVC, verifyVC, createVP, Status List |
| `packages/crypto` | Ed25519 sign/verify, SHA-256 hash, Vault wrappers |
| `packages/dto` | TypeScript interfaces ทั้งหมด (VC, Course, API, Error) |
| `packages/ui` | Shared React/RN components, Thai date utils, grade colors |

---

## Tech Stack (ห้ามเปลี่ยนโดยไม่แจ้ง)

```
Backend:        NestJS (TypeScript strict)
Frontend:       Next.js 15 + shadcn/ui + Tailwind CSS
Mobile:         React Native + Expo SDK 51+
Database:       PostgreSQL 16 + TimescaleDB
Cache/Queue:    Redis 7 + BullMQ
Auth (IdP):     Authentik — OpenID Connect + LDAP Federation
VC/DID:         Veramo + did:web
Signing:        Ed25519 (EdDSA) — Key ใน HashiCorp Vault
Node Auth:      mTLS (X.509, ออกโดย Registry CA)
Push:           Firebase Cloud Messaging (FCM)
Infra:          Docker + Kubernetes + Nginx
Secrets:        HashiCorp Vault (Transit Engine)
Monorepo:       Turborepo + pnpm workspaces
```

## Standards (ห้ามใช้ format อื่น)

```
Identity:           W3C DID Core 1.0 — did:web method
Credential:         W3C Verifiable Credentials 2.0
Signature:          Ed25519Signature2020
Revocation:         W3C Status List 2021
Auth:               OpenID Connect + OAuth2
Node Auth:          RFC 8705 (mTLS)
Course Structure:   1EdTech LIS v2.0
Learning Outcomes:  1EdTech CASE v1.1
External API:       schema.org/Course
```

---

## Module Structure (สำคัญมาก)

### uni-registry/src/
```
node/          → POST /nodes/register, GET /nodes, GET /nodes/:id
aggregate/     → POST /aggregate, GET /aggregate
consent/       → POST /consent/request, PATCH /consent/:id/approve|deny|revoke
               → GET /consent/student/:did, GET /consent/:id
course-index/  → GET /courses (search), GET /equivalency
audit/         → Audit Log service + TimescaleDB
notification/  → FCM Service
auth/          → JWT Guard, mTLS Guard
did/           → GET /.well-known/did.json
common/        → Filters, Pipes, Decorators ที่ใช้ร่วมกัน
```

### uni-node/src/
```
vc/            → POST /vc/issue, GET /vc/:id, POST /vc/verify
               → POST /vc/challenge, POST /vc/present
               → DELETE /vc/:id/revoke
courses/       → GET /courses, GET /courses/:id
               → GET /courses/:id/outcomes (CASE v1.1)
               → GET /courses/:id/syllabus, GET /courses/search
transfer/      → POST /transfer/request, GET /transfer/:id
               → PUT /transfer/:id/approve|reject
sis/           → POST /sis/webhook (รับจาก SIS)
status-list/   → GET /.well-known/status-list/:id (Public)
did/           → GET /.well-known/did.json (Public)
registry-sync/ → Cron job ส่ง Aggregate ทุกคืน
auth/          → JWT Guard, Student Auth
students/      → Student Repository
notification/  → FCM Service
```

### uni-node-portal/app/
```
(auth)/        → login, logout
dashboard/     → สถิติรวม
students/      → ค้นหานักศึกษา, ดู VC
credits/       → รายการ VC ที่ออก
transfer/      → Credit Transfer Requests
courses/       → Course Catalog Management
reports/       → รายงาน
settings/      → SIS Config, Key Info
```

### uni-wallet/app/
```
(auth)/        → welcome, register, login, setup-wallet, setup-pin, setup-biometric
(tabs)/        → index (Home), credits (My VCs), consent, profile
vc/            → [vcId] detail, share flow
consent/       → [consentId] detail, history
transfer/      → [transferId] status
```

---

## ข้อตกลงการเขียน Code

### TypeScript
- `strict: true` เสมอ ห้ามใช้ `any`
- ทุก function ระบุ return type

### NestJS
- ทุก endpoint มี DTO + `class-validator`
- ทุก DB operation อยู่ใน transaction
- ทุก error log ผ่าน NestJS `Logger`
- Repository pattern — ห้าม query ตรงใน Service

### Database
- ทุก Table มี `id UUID DEFAULT gen_random_uuid()`, `created_at`, `updated_at`
- `snake_case` column names
- ทุก migration มี `up` และ `down`

### Security
- ห้าม log PII ใดๆ
- ห้าม commit `.env` หรือ secret
- Private Key ต้องอยู่ใน Vault เท่านั้น

---

## คำสั่งที่ใช้บ่อย

```bash
pnpm dev                           # รันทุก app พร้อมกัน
pnpm dev --filter uni-registry     # รันเฉพาะ Registry
pnpm dev --filter uni-node         # รันเฉพาะ Node
pnpm test                          # test ทุก app
pnpm build                         # build ทุก app
pnpm db:migrate                    # migrate ทุก app
pnpm db:seed                       # seed dev data
docker compose up -d               # start infrastructure
```

---

## เอกสารอ้างอิง (อ่านก่อนเริ่มพัฒนา Sprint ที่เกี่ยวข้อง)

| ไฟล์ | เนื้อหา | อ่านก่อน Sprint |
|---|---|---|
| `docs/01-overview.md` | ภาพรวม, Flow หลัก, Glossary | ทุก Sprint |
| `docs/02-architecture.md` | ADRs 7 ข้อ, Deployment, Security | ทุก Sprint |
| `docs/03-data-models.md` | VC Schema 4 ประเภท, DB Schema ทุก Table, TypeScript Types | 1, 2, 3 |
| `docs/04-api-spec.md` | API ทุกตัว (Registry + Node + Wallet) พร้อม Request/Response | 2, 3, 4 |
| `docs/05-standards.md` | W3C + 1EdTech + Code ตัวอย่าง | 2, 3 |
| `docs/06-governance.md` | Credit Policy, Consent, PDPA, SLA | 1, 5 |
| `docs/07-uniwallet.md` | UniWallet: Screens, Local DB, VP Creation, Zustand, Flows | Phase 3 |
| `docs/08-environment.md` | ENV Variables ทุกตัว ทุก App | 1 |
| `docs/09-testing.md` | Unit/Integration/E2E/Load Test + CI/CD | ทุก Sprint |
| `docs/10-error-codes.md` | Error Codes ทุกตัว + UniLinkException | 2 |
| `docs/11-node-portal.md` | Node Portal: Pages, RBAC, NestJS Module Structure | Phase 2 Sprint 8 |
| `docs/12-project-setup.md` | Monorepo, Config Files, Docker, K8s, Quick Start | 1 |
| `docs/13-packages.md` | vc-core, crypto, dto, ui — Function signatures ทุกตัว | 1, 2 |
| `docs/14-infrastructure-setup.md` | Vault, mTLS CA, Nginx, FCM Setup | 1 |

---

## Sprint Plan

```
=== Phase 1: UniRegistry (Sprint 1–14, เดือน 1-7) ===
Sprint 1-2:   Monorepo Setup + Docker + CI/CD + packages/ (vc-core, crypto, dto)
Sprint 3-4:   Node Directory API + mTLS Guard
Sprint 5-6:   Authentik + LDAP Federation
Sprint 7-8:   Aggregate Service (BullMQ)
Sprint 9-10:  Consent Manager + FCM
Sprint 11-12: Audit Log (TimescaleDB) + Grafana Dashboard
Sprint 13-14: Security Audit + Load Test (k6)

=== Phase 2: UniLink Node (Sprint 1–22, เดือน 5-15) ===
Sprint 1-2:   Node Setup + did:web + Vault Key Gen
Sprint 3-4:   VC Issuer Module (Ed25519 + Status List)
Sprint 5-6:   SIS Webhook Integration
Sprint 7-8:   VC Verification + VP Handler
Sprint 9-10:  Credit Transfer Module
Sprint 11-12: Course Catalog API (LIS v2.0)
Sprint 13-14: Learning Outcomes API (CASE v1.1) + Course Integrity
Sprint 15-16: Admin Portal (Next.js 15) — Phase 1
Sprint 17-18: Registry Sync (Cron) + Aggregate Sender
Sprint 19-20: External Credential (Coursera/edX) Support
Sprint 21-22: Integration Test + Security Audit

=== Phase 3: UniWallet (Sprint 1–16, เดือน 9-16) ===
Sprint 1-2:   Expo Setup + Design System (NativeWind + Sarabun)
Sprint 3-4:   Onboarding + DID Setup + Biometric + PIN
Sprint 5-6:   Home Dashboard + My Credits List
Sprint 7-8:   Share VC Flow (VP + QR + Biometric confirm)
Sprint 9-10:  Consent Flow + Push Notification (FCM)
Sprint 11-12: Profile + Security Settings + Backup/Recovery
Sprint 13-14: Web App (Next.js PWA)
Sprint 15-16: QA + App Store Submission

=== Phase 4: Integration & Launch (เดือน 17-22) ===
Full Integration Test, Penetration Test, Production Deploy
```

---

## Governance Checklist (ต้องเสร็จก่อน Sprint 1)

```
☐ ยืนยัน Root CA และผู้ดูแล Vault
☐ ยืนยัน Domain ของ Registry (registry.unilink.ac.th)
☐ ยืนยัน Firebase Project ID สำหรับ FCM
☐ ยืนยัน มหาวิทยาลัย Pilot แรก + LDAP Schema
☐ ยืนยันว่า SIS ของ Pilot รองรับ Webhook
☐ ยืนยัน TSA URL สำหรับ RFC 3161
☐ ยืนยันผู้ดูแล Course Equivalency
```
