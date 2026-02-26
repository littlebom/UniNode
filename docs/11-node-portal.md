# 11 — UniLink Node Portal (Admin Portal)

## ภาพรวม

uni-node-portal คือ Web Application สำหรับ Staff มหาวิทยาลัย ติดตั้งคู่กับ uni-node ใช้สำหรับจัดการ VC, Course Catalog, Credit Transfer และดูรายงาน ไม่มี Mobile App — ใช้ผ่าน Browser บน Desktop เท่านั้น

---

## Tech Stack

| ส่วน | Technology | หมายเหตุ |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR + API Routes |
| UI Library | shadcn/ui + Tailwind CSS | Component-based |
| Auth | NextAuth.js v5 + Authentik | OpenID Connect |
| State | Zustand | Client state |
| Server State | TanStack Query | API fetching |
| Table | TanStack Table | Data grids |
| Form | React Hook Form + Zod | Validation |
| Charts | Recharts | Dashboard graphs |
| Icons | Lucide React | Icon set |
| Date | date-fns | Date formatting (พ.ศ. support) |

---

## Pages และ Navigation Structure

```
app/
├── (auth)/
│   └── login/
│       └── page.tsx              ← Login ผ่าน Authentik SSO
│
├── (dashboard)/
│   ├── layout.tsx                ← Sidebar + Header layout
│   │
│   ├── page.tsx                  ← Dashboard หลัก
│   │
│   ├── vcs/
│   │   ├── page.tsx              ← รายการ VC ทั้งหมด
│   │   ├── issue/
│   │   │   └── page.tsx          ← ออก VC ด้วย Manual
│   │   └── [vcId]/
│   │       └── page.tsx          ← VC Detail + Revoke
│   │
│   ├── transfers/
│   │   ├── page.tsx              ← รายการ Transfer Requests
│   │   └── [transferId]/
│   │       └── page.tsx          ← Transfer Detail + Approve/Reject
│   │
│   ├── courses/
│   │   ├── page.tsx              ← รายการวิชาทั้งหมด
│   │   ├── new/
│   │   │   └── page.tsx          ← เพิ่มวิชาใหม่
│   │   └── [courseId]/
│   │       ├── page.tsx          ← Course Detail
│   │       ├── edit/
│   │       │   └── page.tsx      ← แก้ไขวิชา
│   │       ├── outcomes/
│   │       │   └── page.tsx      ← จัดการ Learning Outcomes
│   │       └── syllabus/
│   │           └── page.tsx      ← จัดการ Syllabus
│   │
│   ├── students/
│   │   ├── page.tsx              ← รายการนักศึกษา
│   │   └── [studentId]/
│   │       └── page.tsx          ← Student Profile + VC History
│   │
│   ├── external/
│   │   ├── page.tsx              ← รายการ External Credentials รออนุมัติ
│   │   └── [requestId]/
│   │       └── page.tsx          ← Review External Credential
│   │
│   ├── reports/
│   │   └── page.tsx              ← รายงาน + Aggregate Stats
│   │
│   └── settings/
│       ├── page.tsx              ← Node Settings
│       ├── sis/
│       │   └── page.tsx          ← SIS Integration Config
│       └── keys/
│           └── page.tsx          ← Key Management (View-only)
│
└── api/
    └── auth/
        └── [...nextauth]/
            └── route.ts          ← NextAuth handler
```

---

## Page Specifications

### 1. Dashboard (/)

```typescript
interface DashboardStats {
  totalVCsIssued: number        // VC ที่ออกทั้งหมด
  vcsIssuedThisMonth: number    // เดือนนี้
  pendingTransfers: number      // Transfer รออนุมัติ
  pendingExternalReviews: number // External VC รออนุมัติ
  activeStudents: number        // นักศึกษาที่มี UniWallet
  totalCourses: number          // วิชาทั้งหมด
}

interface DashboardChart {
  vcIssuedByMonth: { month: string; count: number }[]   // 12 เดือนล่าสุด
  gradeDistribution: { grade: string; count: number }[] // A, B+, B...
  deliveryModeBreakdown: { mode: string; count: number }[] // Onsite/Online/Hybrid
}
```

**UI Components:**
- Stats Cards (6 การ์ด)
- Line Chart: VC ที่ออกรายเดือน
- Pie Chart: สัดส่วน Grade
- Bar Chart: Onsite vs Online vs Hybrid
- Recent Activity Table (10 รายการล่าสุด)
- Pending Actions Section (Transfer + External รออนุมัติ)

---

### 2. VC List (/vcs)

**Filters:**
- Search: Student ID, Course Name
- Status: All, Active, Revoked, Expired
- Type: CourseCreditCredential, CreditTransferCredential, DegreeCredential, AchievementCredential
- Semester / Academic Year
- Date Range

**Table Columns:**
| Column | ข้อมูล |
|---|---|
| VC ID | ย่อ 12 ตัวแรก + copy button |
| นักศึกษา | Student ID |
| วิชา | Course ID + Course Name |
| เกรด | Badge สีตาม Grade |
| ประเภท | Type Badge |
| สถานะ | Active / Revoked / Expired Badge |
| ออกเมื่อ | วันที่ format พ.ศ. |
| Actions | View, Revoke |

**Actions:**
- Issue VC (Manual) → `/vcs/issue`
- Revoke VC พร้อมระบุเหตุผล (Confirm Dialog)
- Export CSV

---

### 3. Issue VC — Manual (/vcs/issue)

```typescript
// Form Schema (Zod)
const issueVCSchema = z.object({
  studentId: z.string().min(1, 'กรุณากรอกรหัสนักศึกษา'),
  vcType: z.enum(['CourseCreditCredential', 'DegreeCredential', 'AchievementCredential']),
  courseId: z.string().optional(),
  grade: z.enum(['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F', 'S', 'U']).optional(),
  semester: z.enum(['1', '2', 'S']).optional(),
  academicYear: z.string().regex(/^\d{4}$/, 'ปีการศึกษาต้องเป็น 4 หลัก (เช่น 2567)'),
  deliveryMode: z.enum(['Onsite', 'Online', 'Hybrid']).optional(),
  note: z.string().optional(),
})
```

**Form Flow:**
1. เลือก VC Type → Form ปรับตาม Type
2. กรอก Student ID → Auto-verify กับ DB
3. เลือกวิชาจาก Dropdown (Course Catalog)
4. กรอกเกรดและรายละเอียด
5. Preview VC ก่อน Submit
6. Confirm → ออก VC + ส่ง Push Notification

---

### 4. Transfer List (/transfers)

**Filters:**
- Status: Pending, Approved, Rejected
- Source Course, Target Node
- Date Range

**Table Columns:**
| Column | ข้อมูล |
|---|---|
| Transfer ID | ย่อ + copy |
| นักศึกษา | Student ID |
| วิชาต้นทาง | Course ID (Node นี้) |
| ปลายทาง | Node + Course ปลายทาง |
| สถานะ | Pending / Approved / Rejected |
| วันที่ขอ | วันที่ |
| Actions | Review |

---

### 5. Transfer Detail (/transfers/[transferId])

แสดง 3 ส่วน:

**ส่วนที่ 1: ข้อมูล VC ต้นทาง**
- VC ID, Course, Grade, Semester, Academic Year
- VC Verification Status (Valid / Revoked / Expired)
- ปุ่ม: ดู VC ต้นฉบับ

**ส่วนที่ 2: Course Comparison**
```
วิชาต้นทาง (Node นี้)          วิชาปลายทาง
─────────────────────────────────────────────
CS101 - Intro to Programming  → CPE101 - Computer Programming
3 หน่วยกิต                       3 หน่วยกิต
เกรด A                           ✅ ผ่านเกณฑ์ (≥ C+)

Learning Outcomes เปรียบเทียบ:
LO-01: เขียน Python ได้     ↔   LO-01: เขียนโปรแกรมได้ ✅
LO-02: OOP concepts         ↔   LO-02: OOP design ✅

Equivalency Status: ✅ Approved (อนุมัติ 2025-01-01)
```

**ส่วนที่ 3: Decision**
- Textarea: Review Note
- ปุ่ม: Approve (สีเขียว) / Reject (สีแดง)
- ต้องกรอก Review Note ก่อน Submit

---

### 6. Course Management (/courses)

**Table Columns:**
| Column | ข้อมูล |
|---|---|
| Course ID | รหัสวิชา |
| ชื่อวิชา | Thai + EN |
| หน่วยกิต | จำนวน |
| ประเภท | Onsite/Online/Hybrid badge |
| คณะ | ชื่อคณะ |
| LO Count | จำนวน Learning Outcomes |
| สถานะ | Active / Inactive |
| Actions | Edit, Manage LO, View |

---

### 7. Course Form (/courses/new และ /courses/[id]/edit)

```typescript
// Form แบ่งเป็น 4 Tabs
type CourseFormTab = 'basic' | 'outcomes' | 'syllabus' | 'assessments'

// Tab 1: Basic Info (LIS v2.0)
interface BasicInfoForm {
  courseId: string            // ห้ามแก้หลัง create
  courseName: string
  courseNameTH: string
  credits: number
  courseType: string          // Lecture, Lab, Seminar
  deliveryMode: string        // Onsite, Online, Hybrid
  faculty: string
  department: string
  description: string
  descriptionTH: string
  prerequisites: string[]     // Multi-select จาก Course list
  language: string            // Thai, English, Bilingual
}

// Tab 2: Learning Outcomes (CASE v1.1)
// Dynamic list ของ LO — Add/Edit/Delete/Reorder

// Tab 3: Syllabus
// Dynamic list ราย Week — 1-16 สัปดาห์

// Tab 4: Assessments
// Dynamic list ของ Assessment Type + Weight (ผลรวมต้อง = 100%)
```

---

### 8. External Credential Review (/external/[requestId])

**แสดง:**
- แพลตฟอร์มต้นทาง (Coursera, Udemy ฯลฯ)
- ชื่อ Course ภายนอก + สถาบันที่ออก
- วันที่เรียนจบ + คะแนน
- ชั่วโมงเรียน
- Link ยืนยันออนไลน์
- PDF Certificate (viewer ในหน้า)
- วิชาที่ขอ Recognition

**Decision:**
- เลือกวิชาที่จะ Recognize (จาก Course Catalog)
- จำนวนหน่วยกิตที่รับรอง
- Note
- Approve / Reject

---

### 9. Reports (/reports)

**Sections:**
- VC Summary: ออกรายเดือน, ตามประเภท, ตามคณะ
- Transfer Summary: อนุมัติ/ปฏิเสธ รายเดือน, เปอร์เซ็นต์สำเร็จ
- Course Popularity: วิชายอดนิยม, Pass Rate
- External Credential: แพลตฟอร์มที่ขอมากที่สุด

**Export:** PDF, Excel

---

### 10. SIS Integration Settings (/settings/sis)

```typescript
interface SISConfig {
  sisApiUrl: string           // https://sis.tu.ac.th/api
  webhookEndpoint: string     // แสดง URL ที่ SIS ต้องส่งมา (read-only)
  webhookSecret: string       // Masked — ดูได้แต่ copy ได้
  lastWebhookReceived: Date   // ครั้งล่าสุดที่ SIS ส่งมา
  syncStatus: 'connected' | 'error' | 'never_connected'
  testConnection: () => void  // ปุ่มทดสอบการเชื่อมต่อ
}
```

---

## Role-Based Access Control (RBAC)

```typescript
type PortalRole = 'admin' | 'registrar' | 'viewer'

const permissions: Record<PortalRole, string[]> = {
  admin: [
    'vc:issue', 'vc:revoke', 'vc:view',
    'transfer:approve', 'transfer:reject', 'transfer:view',
    'course:create', 'course:edit', 'course:view',
    'external:approve', 'external:reject', 'external:view',
    'student:view',
    'report:view', 'report:export',
    'settings:edit'
  ],
  registrar: [
    'vc:issue', 'vc:view',
    'transfer:approve', 'transfer:reject', 'transfer:view',
    'course:view',
    'external:approve', 'external:reject', 'external:view',
    'student:view',
    'report:view'
  ],
  viewer: [
    'vc:view',
    'transfer:view',
    'course:view',
    'student:view',
    'report:view'
  ]
}
```

---

## NestJS Module Structure — uni-node-portal

uni-node-portal เป็น Next.js ไม่ใช่ NestJS แต่ใช้ Next.js API Routes สำหรับ BFF (Backend for Frontend)

```
apps/uni-node-portal/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  ← Dashboard
│   │   ├── vcs/...
│   │   ├── transfers/...
│   │   ├── courses/...
│   │   ├── students/...
│   │   ├── external/...
│   │   ├── reports/...
│   │   └── settings/...
│   └── api/
│       └── auth/[...nextauth]/route.ts
├── components/
│   ├── ui/                           ← shadcn/ui components
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── nav-items.tsx
│   ├── vc/
│   │   ├── vc-table.tsx
│   │   ├── vc-detail-card.tsx
│   │   ├── issue-vc-form.tsx
│   │   └── revoke-dialog.tsx
│   ├── transfer/
│   │   ├── transfer-table.tsx
│   │   ├── transfer-detail.tsx
│   │   └── course-comparison.tsx
│   ├── course/
│   │   ├── course-table.tsx
│   │   ├── course-form.tsx           ← 4 Tabs
│   │   ├── outcome-editor.tsx        ← CASE v1.1 LO editor
│   │   └── syllabus-editor.tsx
│   └── dashboard/
│       ├── stats-cards.tsx
│       └── charts.tsx
├── lib/
│   ├── api.ts                        ← Axios instance ไปยัง uni-node
│   ├── auth.ts                       ← NextAuth config
│   └── utils.ts                      ← Thai date format, grade color
├── hooks/
│   ├── use-vcs.ts                    ← TanStack Query hooks
│   ├── use-transfers.ts
│   └── use-courses.ts
└── types/
    └── index.ts                      ← Import จาก @unilink/dto
```

---

## NestJS Module Structure — uni-node (Backend)

```
apps/uni-node/src/
├── main.ts
├── app.module.ts
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts        ← POST /auth/login, /auth/refresh, /auth/did/register
│   ├── auth.service.ts
│   ├── jwt.strategy.ts
│   └── dto/
│       ├── login.dto.ts
│       └── register-did.dto.ts
│
├── vc/
│   ├── vc.module.ts
│   ├── vc.controller.ts          ← POST /vc/issue, GET /vc/:id, POST /vc/verify, DELETE /vc/:id/revoke
│   ├── vc.service.ts
│   ├── vc.repository.ts
│   ├── status-list.service.ts    ← W3C Status List 2021 management
│   └── dto/
│       ├── issue-vc.dto.ts
│       └── verify-vc.dto.ts
│
├── course/
│   ├── course.module.ts
│   ├── course.controller.ts      ← GET /courses, GET /courses/:id, GET /courses/:id/outcomes
│   ├── course.service.ts
│   ├── course.repository.ts
│   ├── course-signing.service.ts ← Sign course data ด้วย Ed25519
│   └── dto/
│       ├── create-course.dto.ts
│       └── course-response.dto.ts
│
├── transfer/
│   ├── transfer.module.ts
│   ├── transfer.controller.ts    ← POST /transfer/request, PUT /transfer/:id/approve
│   ├── transfer.service.ts
│   └── transfer.repository.ts
│
├── student/
│   ├── student.module.ts
│   ├── student.service.ts
│   └── student.repository.ts
│
├── sis/
│   ├── sis.module.ts
│   ├── sis.controller.ts         ← POST /sis/webhook (รับจาก SIS)
│   └── sis.service.ts            ← แปลง SIS data → ออก VC
│
├── registry-sync/
│   ├── registry-sync.module.ts
│   ├── registry-sync.service.ts  ← ส่ง Aggregate ไป Registry (Cron)
│   └── registry-sync.scheduler.ts ← @Cron ทุกคืน
│
├── notification/
│   ├── notification.module.ts
│   └── notification.service.ts   ← ส่ง FCM Push
│
├── crypto/
│   ├── crypto.module.ts
│   └── crypto.service.ts         ← Sign/Verify ผ่าน HashiCorp Vault
│
└── did/
    ├── did.module.ts
    ├── did.controller.ts          ← GET /.well-known/did.json, GET /.well-known/status-list/:id
    └── did.service.ts
```

---

## NestJS Module Structure — uni-registry (Backend)

```
apps/uni-registry/src/
├── main.ts
├── app.module.ts
│
├── node/
│   ├── node.module.ts
│   ├── node.controller.ts        ← POST /nodes/register, GET /nodes, GET /nodes/:id
│   ├── node.service.ts
│   └── node.repository.ts
│
├── aggregate/
│   ├── aggregate.module.ts
│   ├── aggregate.controller.ts   ← POST /aggregate, GET /aggregate
│   ├── aggregate.service.ts
│   └── aggregate.repository.ts
│
├── consent/
│   ├── consent.module.ts
│   ├── consent.controller.ts     ← POST /consent/request, PATCH /consent/:id/approve
│   ├── consent.service.ts
│   ├── consent.repository.ts
│   └── consent-token.service.ts  ← ออก + Validate Access Token
│
├── course-index/
│   ├── course-index.module.ts
│   ├── course-index.controller.ts ← GET /courses, GET /equivalency
│   ├── course-index.service.ts
│   └── course-index.repository.ts
│
├── notification/
│   ├── notification.module.ts
│   ├── notification.controller.ts ← POST /notifications/register
│   └── notification.service.ts   ← FCM Push ไปยัง UniWallet
│
├── audit/
│   ├── audit.module.ts
│   └── audit.service.ts          ← บันทึก Audit Log ทุก Action (TimescaleDB)
│
└── auth/
    ├── auth.module.ts
    ├── mtls.guard.ts              ← Guard ตรวจ mTLS Certificate
    └── jwt.strategy.ts
```

---

## SIS Webhook Format

SIS ของมหาวิทยาลัยต้องส่ง Webhook มาในรูปแบบนี้เมื่อบันทึกเกรด

```typescript
// POST https://<node>/unilink/api/v1/sis/webhook
// Header: X-Webhook-Secret: <SIS_WEBHOOK_SECRET>

interface SISWebhookPayload {
  event: 'grade.recorded' | 'grade.updated' | 'grade.cancelled'
  studentId: string           // รหัสนักศึกษา
  courseId: string            // รหัสวิชา
  offeringId?: string         // รหัสกลุ่มเรียน (ถ้ามี)
  grade: string               // A, B+, B, C+, C, D+, D, F, S, U
  semester: '1' | '2' | 'S'
  academicYear: string        // พ.ศ. 4 หลัก เช่น 2567
  deliveryMode?: 'Onsite' | 'Online' | 'Hybrid'
  recordedAt: string          // ISO 8601
  recordedBy?: string         // เลขประจำตัวอาจารย์ (ถ้ามี)
}
```

**Response จาก Node:**
```json
{ "received": true, "vcId": "vc-tu-cs101-6501234-2567-1" }
```
