# 04 — API Specification

## Base URLs

| ระบบ | URL | หมายเหตุ |
|---|---|---|
| UniRegistry | `https://registry.unilink.ac.th/api/v1` | Central |
| UniLink Node | `https://<domain>/unilink/api/v1` | Per-university |

## Authentication

| ช่องทาง | Method | ใช้ที่ |
|---|---|---|
| Staff / Student | `Authorization: Bearer <JWT>` | ทุก endpoint |
| Node → Registry | mTLS Certificate | เพิ่มเติมจาก JWT |
| Public | ไม่ต้อง Auth | `/.well-known/did.json`, `GET /courses` (บาง endpoint) |

---

# UniRegistry APIs

## Module A — Node Directory

### POST /nodes/register
ลงทะเบียน Node ใหม่เข้า Consortium

**Auth:** mTLS + Admin JWT

**Request:**
```json
{
  "nodeId": "tu.ac.th",
  "name": "มหาวิทยาลัยธรรมศาสตร์",
  "nameEN": "Thammasat University",
  "did": "did:web:tu.ac.th",
  "publicKey": "ed25519-pub-key-base58...",
  "apiEndpoint": "https://tu.ac.th/unilink/api/v1",
  "certThumbprint": "sha256:abc123..."
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "nodeId": "tu.ac.th",
    "status": "active",
    "joinedAt": "2025-01-01T10:00:00Z"
  }
}
```

---

### GET /nodes
รายการ Node ทั้งหมดใน Consortium

**Auth:** JWT

**Query:** `?status=active&page=1&limit=20`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "nodeId": "tu.ac.th",
      "name": "มหาวิทยาลัยธรรมศาสตร์",
      "did": "did:web:tu.ac.th",
      "apiEndpoint": "https://tu.ac.th/unilink/api/v1",
      "status": "active"
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### GET /nodes/:nodeId
ข้อมูล Node เฉพาะแห่ง

**Response 200:**
```json
{
  "success": true,
  "data": {
    "nodeId": "tu.ac.th",
    "name": "มหาวิทยาลัยธรรมศาสตร์",
    "did": "did:web:tu.ac.th",
    "publicKey": "ed25519-pub-key...",
    "apiEndpoint": "https://tu.ac.th/unilink/api/v1",
    "status": "active",
    "joinedAt": "2025-01-01T10:00:00Z"
  }
}
```

---

## Module B — Aggregate Service

### POST /aggregate
Node ส่ง Aggregate ประจำวัน (เรียกโดย Node เท่านั้น)

**Auth:** mTLS + Node JWT

**Request:**
```json
{
  "nodeId": "tu.ac.th",
  "academicYear": "2567",
  "semester": "1",
  "courses": [
    {
      "courseId": "CS101",
      "enrolledCount": 120,
      "passedCount": 108,
      "avgGradePoint": 3.2
    }
  ]
}
```

---

### GET /aggregate
Query สถิติ Aggregate

**Query:** `?courseId=CS101&nodeId=tu.ac.th&year=2567&semester=1`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "courseId": "CS101",
      "nodeId": "tu.ac.th",
      "academicYear": "2567",
      "semester": "1",
      "enrolledCount": 120,
      "passedCount": 108,
      "passRate": 90.0,
      "avgGradePoint": 3.2
    }
  ]
}
```

---

## Module C — Consent Manager

### POST /consent/request
Node ปลายทางขอ Consent เข้าถึงข้อมูลนักศึกษา

**Auth:** mTLS + Node JWT

**Request:**
```json
{
  "requesterNodeId": "chula.ac.th",
  "studentDid": "did:web:tu.ac.th:students:6501234",
  "purpose": "ตรวจสอบคุณสมบัติการโอนหน่วยกิต วิชา CPE101",
  "dataScope": {
    "vcs": ["vc-tu-cs101-6501234-2567-1"],
    "courses": ["CS101"]
  },
  "expiresIn": 604800
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "consentId": "consent-uuid",
    "status": "pending",
    "notificationSent": true
  }
}
```

---

### PUT /consent/:consentId/approve
นักศึกษาอนุมัติ Consent Request

**Auth:** Student JWT

**Response 200:**
```json
{
  "success": true,
  "data": {
    "consentId": "consent-uuid",
    "status": "approved",
    "token": "access-token-jwt",
    "expiresAt": "2025-02-01T10:00:00Z"
  }
}
```

---

### PUT /consent/:consentId/deny
นักศึกษาปฏิเสธ

### PUT /consent/:consentId/revoke
นักศึกษา Revoke Consent ที่เคยอนุมัติ

### GET /consent/student/:studentDid
ดู Consent ทั้งหมดของนักศึกษา (Auth: Student JWT)

---

## Course Index

### GET /courses
ค้นหาวิชาจาก Consortium ทั้งหมด

**Query:** `?keyword=programming&nodeId=tu.ac.th&credits=3&page=1&limit=20`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "courseId": "CS101",
      "courseName": "Introduction to Programming",
      "nodeId": "tu.ac.th",
      "credits": 3,
      "faculty": "คณะวิทยาศาสตร์",
      "detailUrl": "https://tu.ac.th/unilink/api/v1/courses/CS101"
    }
  ]
}
```

---

### GET /equivalency
ดูตารางเทียบวิชา

**Query:** `?courseId=CS101&fromNode=tu.ac.th&toNode=chula.ac.th`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "sourceCourse": "CS101",
      "sourceNode": "tu.ac.th",
      "targetCourse": "CPE101",
      "targetNode": "chula.ac.th",
      "status": "approved",
      "conditions": "เกรดขั้นต่ำ C+",
      "approvedDate": "2025-01-01"
    }
  ]
}
```

---

# UniLink Node APIs

## VC Management

### POST /vc/issue
ออก VC ให้นักศึกษา (เรียกจาก SIS Webhook หรือ Manual)

**Auth:** Internal / Webhook Secret

**Request:**
```json
{
  "studentId": "6501234",
  "vcType": "CourseCreditCredential",
  "courseId": "CS101",
  "grade": "A",
  "semester": "1",
  "academicYear": "2567",
  "deliveryMode": "Onsite"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "vcId": "vc-tu-cs101-6501234-2567-1",
    "status": "issued",
    "sentToWallet": true
  }
}
```

---

### GET /vc/:vcId
ดูรายละเอียด VC (เรียกโดย Node เจ้าของ)

### POST /vc/verify
ตรวจสอบ VC หรือ VP ที่ได้รับ

**Request:**
```json
{
  "vp": { "...VP JSON..." },
  "challenge": "random-challenge-string",
  "domain": "cmu.ac.th"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "holder": "did:web:tu.ac.th:students:6501234",
    "credentials": [
      {
        "vcId": "vc-tu-cs101-6501234-2567-1",
        "type": "CourseCreditCredential",
        "issuer": "did:web:tu.ac.th",
        "isValid": true,
        "isRevoked": false
      }
    ]
  }
}
```

---

### DELETE /vc/:vcId/revoke
Revoke VC (เฉพาะ Node เจ้าของ)

**Request:**
```json
{ "reason": "ข้อมูลเกรดผิดพลาด" }
```

---

### POST /vc/challenge
ส่ง Challenge ให้นักศึกษาพิสูจน์ตัวตน

**Response 200:**
```json
{
  "success": true,
  "data": {
    "challenge": "random-uuid-string",
    "expiresIn": 300
  }
}
```

---

## Course Catalog API (LIS v2.0 + CASE v1.1)

### GET /courses
รายการวิชาทั้งหมด

**Query:** `?faculty=science&deliveryMode=Online&credits=3&page=1&limit=20`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "courseId": "CS101",
      "courseName": "Introduction to Programming",
      "courseNameTH": "การเขียนโปรแกรมเบื้องต้น",
      "credits": 3,
      "deliveryMode": "Onsite",
      "faculty": "คณะวิทยาศาสตร์",
      "department": "ภาควิชาวิทยาการคอมพิวเตอร์",
      "isActive": true
    }
  ]
}
```

---

### GET /courses/:courseId
รายละเอียดวิชาเต็ม (LIS v2.0 format)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "courseId": "CS101",
    "courseName": "Introduction to Programming",
    "courseNameTH": "การเขียนโปรแกรมเบื้องต้น",
    "credits": 3,
    "courseType": "Lecture + Lab",
    "deliveryMode": "Onsite",
    "org": {
      "faculty": "คณะวิทยาศาสตร์",
      "department": "ภาควิชาวิทยาการคอมพิวเตอร์"
    },
    "description": "วิชานี้ศึกษาเกี่ยวกับหลักการพื้นฐานของการเขียนโปรแกรม...",
    "prerequisites": ["MATH101"],
    "language": "Thai",
    "assessments": [
      { "type": "Midterm Exam", "weight": 30 },
      { "type": "Final Exam",   "weight": 40 },
      { "type": "Assignment",   "weight": 30 }
    ],
    "integrity": {
      "hash": "sha256:a3f5c2d...",
      "signature": "ed25519-signature...",
      "signingKey": "did:web:tu.ac.th#key-1"
    }
  }
}
```

---

### GET /courses/:courseId/outcomes
Learning Outcomes ตาม CASE v1.1

**Response 200:**
```json
{
  "success": true,
  "data": {
    "identifier": "uuid-cs101-lo-2025",
    "uri": "https://tu.ac.th/unilink/api/v1/courses/CS101/outcomes",
    "title": "CS101 Learning Outcomes",
    "courseId": "CS101",
    "lastChangeDateTime": "2025-01-01T00:00:00Z",
    "CFItems": [
      {
        "identifier": "uuid-lo-001",
        "courseId": "CS101",
        "fullStatement": "นักศึกษาสามารถอธิบายหลักการเขียนโปรแกรมเชิงวัตถุได้",
        "fullStatementTH": "นักศึกษาสามารถอธิบายหลักการเขียนโปรแกรมเชิงวัตถุได้",
        "humanCodingScheme": "CS101-LO-01",
        "educationLevel": "undergraduate",
        "bloomLevel": "Understand",
        "sortOrder": 1
      },
      {
        "identifier": "uuid-lo-002",
        "humanCodingScheme": "CS101-LO-02",
        "fullStatement": "นักศึกษาสามารถเขียนโปรแกรม Python เบื้องต้นได้",
        "bloomLevel": "Apply",
        "sortOrder": 2
      }
    ]
  }
}
```

---

### GET /courses/:courseId/syllabus
Syllabus รายสัปดาห์

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "week": 1, "topic": "Introduction to Python", "topicTH": "แนะนำ Python" },
    { "week": 2, "topic": "Variables and Data Types" },
    { "week": 3, "topic": "Control Flow (if/else, loops)" }
  ]
}
```

---

### GET /courses/search
ค้นหาวิชาด้วย keyword

**Query:** `?q=programming&faculty=science&credits=3`

---

## Credit Transfer

### POST /transfer/request
ส่ง Credit Transfer Request

**Request:**
```json
{
  "studentId": "6501234",
  "sourceVcId": "vc-tu-cs101-6501234-2567-1",
  "sourceCourseId": "CS101",
  "targetNodeId": "chula.ac.th",
  "targetCourseId": "CPE101"
}
```

---

### GET /transfer/:transferId
ดูสถานะ Transfer

### PUT /transfer/:transferId/approve
Staff อนุมัติ (Admin JWT)

**Request:**
```json
{
  "reviewNote": "ผ่านตามเกณฑ์ เกรด A สูงกว่าขั้นต่ำ C+"
}
```

### PUT /transfer/:transferId/reject
Staff ปฏิเสธ

---

## DID Document (Public)

### GET /.well-known/did.json
DID Document ของมหาวิทยาลัย (Public — ไม่ต้อง Auth)

**Response 200:**
```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:tu.ac.th",
  "verificationMethod": [
    {
      "id": "did:web:tu.ac.th#key-1",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:web:tu.ac.th",
      "publicKeyMultibase": "z6Mkf..."
    }
  ],
  "assertionMethod": ["did:web:tu.ac.th#key-1"],
  "authentication": ["did:web:tu.ac.th#key-1"]
}
```

---

## Status List (Public)

### GET /.well-known/status-list/:listId
Status List สำหรับตรวจสอบ Revocation (Public)

---

## Error Codes

| Code | HTTP | ความหมาย |
|---|---|---|
| `AUTH_REQUIRED` | 401 | ไม่มี JWT |
| `AUTH_INVALID` | 401 | JWT ไม่ถูกต้อง |
| `FORBIDDEN` | 403 | ไม่มีสิทธิ์ |
| `NODE_NOT_FOUND` | 404 | ไม่พบ Node |
| `VC_NOT_FOUND` | 404 | ไม่พบ VC |
| `COURSE_NOT_FOUND` | 404 | ไม่พบวิชา |
| `VC_REVOKED` | 410 | VC ถูก Revoke แล้ว |
| `VC_EXPIRED` | 410 | VC หมดอายุ |
| `CONSENT_REQUIRED` | 403 | ต้องได้รับ Consent ก่อน |
| `CONSENT_EXPIRED` | 403 | Consent หมดอายุ |
| `SIGNATURE_INVALID` | 422 | Signature ไม่ถูกต้อง |
| `VALIDATION_ERROR` | 422 | ข้อมูล Input ไม่ถูกต้อง |
| `RATE_LIMITED` | 429 | เรียก API บ่อยเกินไป |

---

# UniWallet API Calls

> UniWallet ไม่ใช่ Server — แต่เรียกใช้ API จากระบบอื่น
> Section นี้สรุป API ทุกตัวที่ UniWallet ต้องเรียก

## Auth

```
POST  <node>/unilink/api/v1/auth/login
Body: { studentId, password }
Res:  { token, refreshToken, did }

POST  <node>/unilink/api/v1/auth/refresh
Body: { refreshToken }
Res:  { token }

POST  <node>/unilink/api/v1/auth/did/register
Body: { studentId, did, publicKey }
Res:  { success }
```

## VC Management (Wallet → Node ของตัวเอง)

```
GET   <node>/unilink/api/v1/vc?studentId=xxx
Res:  { data: VC[] }

GET   <node>/unilink/api/v1/vc/:vcId
Res:  { data: VC }

POST  <node>/unilink/api/v1/vc/verify
Body: { vcDocument }
Res:  { isValid, error? }
```

## Challenge & Present (Wallet → Node ปลายทาง)

```
POST  <target-node>/unilink/api/v1/vc/challenge
Res:  { challenge, expiresIn }

POST  <target-node>/unilink/api/v1/vc/verify
Body: { vp, challenge, domain }
Res:  { isValid, holder, credentials[] }
```

## Consent (Wallet → Registry)

```
GET   <registry>/api/v1/consent/student/:did
Res:  { data: ConsentRequest[] }

GET   <registry>/api/v1/consent/:id
Res:  { data: ConsentRequest }

PATCH <registry>/api/v1/consent/:id/approve
Res:  { status, token, expiresAt }

PATCH <registry>/api/v1/consent/:id/deny
Res:  { status }

PATCH <registry>/api/v1/consent/:id/revoke
Res:  { status }
```

## Notification (Wallet → Registry)

```
POST   <registry>/api/v1/notifications/register
Body:  { did, fcmToken, platform }
Res:   { success }

DELETE <registry>/api/v1/notifications/register
Body:  { did }
Res:   { success }
```

## Course Info (Wallet → Node ต้นทาง — Optional)

```
GET   <issuer-node>/unilink/api/v1/courses/:courseId
Res:  { data: LISCourseTemplate }

GET   <issuer-node>/unilink/api/v1/courses/:courseId/outcomes
Res:  { data: CASEDocument }
```
