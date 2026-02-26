# 05 — Standards Reference

## 1. W3C DID (did:web)

### DID Document Format
```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "id": "did:web:tu.ac.th",
  "verificationMethod": [
    {
      "id": "did:web:tu.ac.th#key-1",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:web:tu.ac.th",
      "publicKeyMultibase": "z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9y84QKe2MK9yqYqBMr"
    }
  ],
  "assertionMethod":  ["did:web:tu.ac.th#key-1"],
  "authentication":   ["did:web:tu.ac.th#key-1"]
}
```

### URL Pattern
```
DID:    did:web:tu.ac.th
URL:    https://tu.ac.th/.well-known/did.json

DID:    did:web:tu.ac.th:students:6501234
URL:    https://tu.ac.th/students/6501234/did.json
```

### Implementation (Veramo)
```typescript
import { createAgent } from '@veramo/core'
import { DIDManager } from '@veramo/did-manager'
import { WebDIDProvider } from '@veramo/did-provider-web'
import { KeyManager } from '@veramo/key-manager'

const agent = createAgent({
  plugins: [
    new DIDManager({
      providers: {
        'did:web': new WebDIDProvider({ defaultKms: 'local' })
      }
    }),
    new KeyManager({ store: new KeyStore(dbConnection), kms: { local: new KeyManagementSystem(new PrivateKeyStore(dbConnection, new SecretBox(KMS_SECRET_KEY))) } })
  ]
})

// สร้าง DID สำหรับมหาวิทยาลัย
const did = await agent.didManagerCreate({
  provider: 'did:web',
  alias: 'tu.ac.th'
})
```

---

## 2. W3C Verifiable Credentials 2.0

### VC Context ที่ต้องใส่
```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://unilink.ac.th/credentials/v1"
  ]
}
```

### VC Types ที่กำหนด
```
CourseCreditCredential    — หน่วยกิตรายวิชา
CreditTransferCredential  — การโอนหน่วยกิต
DegreeCredential          — ปริญญาบัตร
AchievementCredential     — วิชาภายนอก (Coursera, edX)
```

### Verifiable Presentation (VP)
```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiablePresentation"],
  "holder": "did:web:tu.ac.th:students:6501234",
  "verifiableCredential": [
    { "...VC 1..." },
    { "...VC 2..." }
  ],
  "proof": {
    "type": "Ed25519Signature2020",
    "challenge": "random-challenge-from-verifier",
    "domain": "chula.ac.th",
    "created": "2025-01-01T10:00:00Z",
    "verificationMethod": "did:web:tu.ac.th:students:6501234#key-1",
    "proofPurpose": "authentication",
    "proofValue": "eyJhbGc..."
  }
}
```

### VC Verification Steps (6 ขั้น)
```
1. Parse VC และตรวจสอบ structure
2. ดึง Public Key จาก did.json ของ issuer
3. Verify Ed25519 Signature
4. ตรวจสอบ issuanceDate และ expirationDate
5. ดึง Status List และตรวจสอบว่าไม่ถูก Revoke
6. ส่ง Challenge → รับ VP → Verify VP Proof
   (เพื่อพิสูจน์ว่า holder ถือ Private Key จริง)
```

---

## 3. W3C Status List 2021

### Status List Credential
```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/vc/status-list/2021/v1"
  ],
  "id": "https://tu.ac.th/.well-known/status-list/1",
  "type": ["VerifiableCredential", "StatusList2021Credential"],
  "issuer": "did:web:tu.ac.th",
  "issuanceDate": "2025-01-01T00:00:00Z",
  "credentialSubject": {
    "id": "https://tu.ac.th/.well-known/status-list/1#list",
    "type": "StatusList2021",
    "statusPurpose": "revocation",
    "encodedList": "H4sIAAAAAAAAA-3BMQ0AAAACIGf..."
  }
}
```

### VC ที่อ้างอิง Status List
```json
"credentialStatus": {
  "id": "https://tu.ac.th/.well-known/status-list/1#42",
  "type": "StatusList2021Entry",
  "statusPurpose": "revocation",
  "statusListIndex": "42",
  "statusListCredential": "https://tu.ac.th/.well-known/status-list/1"
}
```

### Implementation
```typescript
import { createStatusList, checkStatus } from '@digitalbazaar/vc-status-list'

// สร้าง Status List (16KB รองรับ 131,072 VCs)
const statusList = await createStatusList({ length: 131072 })

// Revoke VC (set bit ที่ index 42 เป็น 1)
await statusList.setStatus(42, true)

// ตรวจสอบ
const isRevoked = await checkStatus({ vc, documentLoader })
```

---

## 4. Ed25519 Digital Signature

### Key Generation
```typescript
import { generateKeyPair } from '@stablelib/ed25519'

// สร้าง Key Pair
const { publicKey, secretKey } = generateKeyPair()

// เก็บ Private Key ใน Vault — ห้ามเก็บใน DB หรือ ENV ตรงๆ
await vault.write('secret/tu-ac-th/signing-key', {
  privateKey: Buffer.from(secretKey).toString('base64')
})
```

### Sign VC
```typescript
import { sign } from '@stablelib/ed25519'

const payload = canonicalize(vcDocument)  // JSON Canonicalization
const signature = sign(secretKey, new TextEncoder().encode(payload))
const proofValue = base64url.encode(signature)
```

### Verify Signature
```typescript
import { verify } from '@stablelib/ed25519'

const isValid = verify(
  publicKey,
  new TextEncoder().encode(canonicalize(vcDocument)),
  base64url.decode(proofValue)
)
```

### Course Data Signing (Integrity)
```typescript
// Sign Course Data เมื่อ serve ออก API
const courseHash = sha256(JSON.stringify(courseData))
const signature = await vault.sign('tu-ac-th/signing-key', courseHash)

return {
  ...courseData,
  integrity: {
    hash: `sha256:${courseHash.toString('hex')}`,
    signature: base64url.encode(signature),
    signingKey: 'did:web:tu.ac.th#key-1'
  }
}
```

---

## 5. 1EdTech LIS v2.0

### Course Template (โครงสร้างหลักของวิชา)
```typescript
interface LISCourseTemplate {
  // ส่วน Identification
  courseTemplateId: string;  // courseId ของมหาวิทยาลัย
  title: string;             // ชื่อวิชา
  credits: number;

  // ส่วน Organization
  org: {
    sourcedId?: string;
    name?: string;           // faculty / department
  };

  // ส่วน Content
  courseCode?: string;
  description?: string;
  subject?: string;
  subjectArea?: string[];    // prerequisites

  // ส่วน Delivery
  courseType?: string;       // Lecture, Lab, Seminar
  language?: string;

  // ส่วน Metadata
  status: 'active' | 'inactive' | 'tobedeleted';
  dateLastModified: string;  // ISO 8601
  extensions?: Record<string, unknown>;  // UniLink-specific fields
}
```

### การเพิ่ม Extension fields
```typescript
// LIS v2.0 รองรับ extensions สำหรับ field ที่ไม่มีใน standard
const course: LISCourseTemplate = {
  courseTemplateId: 'CS101',
  title: 'Introduction to Programming',
  credits: 3,
  status: 'active',
  dateLastModified: '2025-01-01T00:00:00Z',
  extensions: {
    // UniLink-specific fields
    'unilink:courseNameTH': 'การเขียนโปรแกรมเบื้องต้น',
    'unilink:deliveryMode': 'Onsite',
    'unilink:faculty': 'คณะวิทยาศาสตร์',
    'unilink:department': 'ภาควิชาวิทยาการคอมพิวเตอร์'
  }
}
```

---

## 6. 1EdTech CASE v1.1

### CFDocument (Learning Outcomes สำหรับวิชา)
```typescript
interface CASECFDocument {
  identifier: string;        // UUID
  uri: string;               // URL ของ document นี้
  creator?: string;          // มหาวิทยาลัย
  title: string;             // 'CS101 Learning Outcomes'
  lastChangeDateTime: string;
  officialSourceURL?: string;
  publisher?: string;
  description?: string;
  subject?: string[];
  language?: string;
  adoptionStatus?: string;
  version?: string;
  CFItems: CASECFItem[];
  CFAssociations?: CASECFAssociation[];
}

interface CASECFItem {
  identifier: string;        // UUID เฉพาะของ LO นี้
  uri: string;               // URL ของ LO นี้
  fullStatement: string;     // ข้อความ LO ภาษาอังกฤษ
  humanCodingScheme?: string; // 'CS101-LO-01'
  educationLevel?: string[]; // ['undergraduate']
  CFItemType?: string;       // 'LearningOutcome'
  language?: string;
  lastChangeDateTime: string;
  // UniLink extensions
  extensions?: {
    'unilink:fullStatementTH'?: string;  // LO ภาษาไทย
    'unilink:bloomLevel'?: string;       // Remember, Understand, Apply...
    'unilink:sortOrder'?: number;
  };
}
```

### Response format จาก GET /courses/:id/outcomes
```json
{
  "CFDocument": {
    "identifier": "550e8400-e29b-41d4-a716-446655440000",
    "uri": "https://tu.ac.th/unilink/api/v1/courses/CS101/outcomes",
    "title": "CS101 Learning Outcomes",
    "lastChangeDateTime": "2025-01-01T00:00:00Z",
    "publisher": "มหาวิทยาลัยธรรมศาสตร์"
  },
  "CFItems": [
    {
      "identifier": "a1b2c3d4-...",
      "uri": "https://tu.ac.th/unilink/api/v1/courses/CS101/outcomes/a1b2c3d4",
      "fullStatement": "Explain object-oriented programming concepts",
      "humanCodingScheme": "CS101-LO-01",
      "educationLevel": ["undergraduate"],
      "CFItemType": "LearningOutcome",
      "lastChangeDateTime": "2025-01-01T00:00:00Z",
      "extensions": {
        "unilink:fullStatementTH": "อธิบายหลักการเขียนโปรแกรมเชิงวัตถุได้",
        "unilink:bloomLevel": "Understand"
      }
    }
  ]
}
```

---

## 7. schema.org/Course (External Format)

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "courseCode": "CS101",
  "name": "Introduction to Programming",
  "description": "Learn Python programming fundamentals...",
  "numberOfCredits": 3,
  "inLanguage": "th",
  "provider": {
    "@type": "Organization",
    "name": "Thammasat University",
    "url": "https://tu.ac.th"
  },
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseMode": "Onsite",
    "instructor": {
      "@type": "Person",
      "name": "ผศ.ดร.สมชาย ใจดี"
    }
  },
  "educationalCredentialAwarded": "3 Credits",
  "teaches": [
    "Python programming",
    "Object-oriented programming",
    "Algorithm design"
  ]
}
```

---

## 8. OpenID Connect (Authentik)

### JWT Claims ที่ใช้
```json
{
  "sub": "user-uuid",           // User ID
  "iss": "https://auth.unilink.ac.th",
  "aud": "uni-node-app",
  "exp": 1735689600,
  "iat": 1735686000,
  "email": "staff@tu.ac.th",
  "groups": ["tu-ac-th-staff"], // กลุ่มของ Authentik
  "unilink_node": "tu.ac.th",   // Custom claim — Node ที่ผูกอยู่
  "unilink_role": "admin"       // Custom claim — Role ใน UniLink
}
```

### LDAP Federation Config (Authentik)
```yaml
# Authentik LDAP Federation สำหรับ มธ.
name: Thammasat University LDAP
server_uri: ldaps://ldap.tu.ac.th:636
bind_cn: cn=unilink,dc=tu,dc=ac,dc=th
bind_password: <from vault>
base_dn: dc=tu,dc=ac,dc=th
user_search_filter: (objectClass=person)
group_search_filter: (objectClass=group)
user_attribute_mapping:
  username: uid
  name: cn
  email: mail
```

---

## 9. RFC 3161 Timestamping

ใช้สำหรับ Audit Log ที่ต้องการ Legal Non-repudiation

```typescript
import { TimeStampRequest, TimeStampResponse } from 'pkijs'

// ขอ Timestamp จาก TSA (Timestamp Authority)
const tsaUrl = 'https://freetsa.org/tsr'
const tsRequest = new TimeStampRequest({
  hashAlgorithm: 'SHA-256',
  messageImprint: sha256(auditData)
})

const tsResponse = await fetch(tsaUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/timestamp-query' },
  body: tsRequest.toBuffer()
})

// เก็บ Timestamp Token ใน Audit Log
const tsToken = await tsResponse.arrayBuffer()
```
