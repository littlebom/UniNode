# 03 — Data Models

## 1. Verifiable Credential (VC) Schemas

### 1.1 Course Credit VC
```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://unilink.ac.th/credentials/v1"
  ],
  "id": "vc-tu-cs101-6501234-2567-1",
  "type": ["VerifiableCredential", "CourseCreditCredential"],
  "issuer": "did:web:tu.ac.th",
  "issuanceDate": "2025-01-01T10:00:00Z",
  "expirationDate": "2032-01-01T00:00:00Z",
  "credentialStatus": {
    "id": "https://tu.ac.th/.well-known/status-list/1#42",
    "type": "StatusList2021Entry",
    "statusPurpose": "revocation",
    "statusListIndex": "42",
    "statusListCredential": "https://tu.ac.th/.well-known/status-list/1"
  },
  "credentialSubject": {
    "id": "did:web:tu.ac.th:students:6501234",
    "studentId": "6501234",
    "studentName": "นายสมชาย ใจดี",
    "courseId": "CS101",
    "courseName": "Introduction to Programming",
    "courseNameTH": "การเขียนโปรแกรมเบื้องต้น",
    "credits": 3,
    "grade": "A",
    "gradePoint": 4.0,
    "semester": "1",
    "academicYear": "2567",
    "deliveryMode": "Onsite",
    "faculty": "คณะวิทยาศาสตร์",
    "department": "ภาควิชาวิทยาการคอมพิวเตอร์",
    "institution": "มหาวิทยาลัยธรรมศาสตร์",
    "institutionDID": "did:web:tu.ac.th"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2025-01-01T10:00:00Z",
    "verificationMethod": "did:web:tu.ac.th#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "eyJhbGciOiJFZERTQS..."
  }
}
```

### 1.2 Credit Transfer VC
```json
{
  "type": ["VerifiableCredential", "CreditTransferCredential"],
  "issuer": "did:web:chula.ac.th",
  "credentialSubject": {
    "id": "did:web:tu.ac.th:students:6501234",
    "transferType": "CreditTransfer",
    "sourceCourse": {
      "courseId": "CS101",
      "courseName": "Introduction to Programming",
      "credits": 3,
      "grade": "A",
      "institution": "มหาวิทยาลัยธรรมศาสตร์",
      "institutionDID": "did:web:tu.ac.th",
      "sourceVC": "vc-tu-cs101-6501234-2567-1"
    },
    "targetCourse": {
      "courseId": "CPE101",
      "courseName": "Computer Programming",
      "credits": 3,
      "institution": "จุฬาลงกรณ์มหาวิทยาลัย"
    },
    "approvedBy": "ผศ.ดร.สมศรี มีสุข",
    "approvedByDID": "did:web:chula.ac.th:faculty:somsri",
    "approvedDate": "2025-02-01",
    "transferStatus": "approved",
    "conditions": "เกรดขั้นต่ำ C+"
  }
}
```

### 1.3 Degree VC
```json
{
  "type": ["VerifiableCredential", "DegreeCredential"],
  "credentialSubject": {
    "id": "did:web:tu.ac.th:students:6501234",
    "degreeType": "Bachelor of Science",
    "degreeName": "วิทยาศาสตรบัณฑิต",
    "major": "วิทยาการคอมพิวเตอร์",
    "minor": "คณิตศาสตร์",
    "totalCredits": 120,
    "GPA": 3.75,
    "honor": "เกียรตินิยมอันดับ 1",
    "graduationDate": "2568-05-20",
    "institution": "มหาวิทยาลัยธรรมศาสตร์",
    "faculty": "คณะวิทยาศาสตร์"
  }
}
```

### 1.4 Achievement VC (External Credential)
```json
{
  "type": ["VerifiableCredential", "AchievementCredential"],
  "credentialSubject": {
    "id": "did:web:tu.ac.th:students:6501234",
    "achievementType": "ExternalCertification",
    "achievementName": "Machine Learning",
    "externalCredential": {
      "platform": "Coursera",
      "courseName": "Machine Learning Specialization",
      "issuedBy": "Stanford University",
      "originalVC": "did:web:coursera.org:vc-12345",
      "completionHours": 60,
      "score": 95,
      "verificationMethod": "AutomaticVC"
    },
    "recognizedBy": "มหาวิทยาลัยธรรมศาสตร์",
    "recognizedCredits": 2,
    "recognizedCourse": "ELEC501",
    "recognizedDate": "2025-03-01",
    "approvedBy": "did:web:tu.ac.th:faculty:somchai"
  }
}
```

---

## 2. Database Schema — UniRegistry

```sql
-- ทะเบียน Node ทั้งหมดใน Consortium
CREATE TABLE nodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id         VARCHAR(100) UNIQUE NOT NULL,  -- 'tu.ac.th'
  name            VARCHAR(200) NOT NULL,           -- 'มหาวิทยาลัยธรรมศาสตร์'
  name_en         VARCHAR(200),
  did             VARCHAR(255) NOT NULL,           -- 'did:web:tu.ac.th'
  public_key      TEXT NOT NULL,                   -- Ed25519 public key (base58)
  cert_thumbprint TEXT,                            -- mTLS certificate thumbprint
  api_endpoint    TEXT NOT NULL,                   -- 'https://tu.ac.th/api'
  status          VARCHAR(20) DEFAULT 'active',    -- active, suspended, revoked
  joined_at       TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Aggregate สถิติจากแต่ละ Node (ไม่มี PII)
CREATE TABLE course_aggregates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       VARCHAR(50) NOT NULL,
  node_id         VARCHAR(100) NOT NULL REFERENCES nodes(node_id),
  academic_year   VARCHAR(10) NOT NULL,
  semester        VARCHAR(5)  NOT NULL,
  enrolled_count  INTEGER DEFAULT 0,
  passed_count    INTEGER DEFAULT 0,
  pass_rate       DECIMAL(5,2),
  avg_grade_point DECIMAL(4,2),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(course_id, node_id, academic_year, semester)
);

-- Consent Request จาก Node ปลายทางถึงนักศึกษา
CREATE TABLE consent_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_node  VARCHAR(100) NOT NULL REFERENCES nodes(node_id),
  student_did     VARCHAR(255) NOT NULL,
  purpose         TEXT NOT NULL,
  data_scope      JSONB NOT NULL,         -- {'vcs': ['vc-id-1'], 'courses': ['CS101']}
  status          VARCHAR(20) DEFAULT 'pending',  -- pending, approved, denied, revoked, expired
  token           TEXT,                   -- access token เมื่ออนุมัติ
  token_expires_at TIMESTAMP WITH TIME ZONE,
  expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Course Index (ชี้ไปยัง Course Detail ที่ Node)
CREATE TABLE course_index (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       VARCHAR(50) NOT NULL,
  course_name     VARCHAR(200) NOT NULL,
  course_name_th  VARCHAR(200),
  node_id         VARCHAR(100) NOT NULL REFERENCES nodes(node_id),
  credits         INTEGER NOT NULL,
  faculty         VARCHAR(200),
  department      VARCHAR(200),
  detail_url      TEXT NOT NULL,          -- URL ไปดึง Course Detail จาก Node
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(course_id, node_id)
);

-- ตารางเทียบวิชาระหว่างมหาวิทยาลัย
CREATE TABLE course_equivalency (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node     VARCHAR(100) NOT NULL REFERENCES nodes(node_id),
  source_course   VARCHAR(50)  NOT NULL,
  target_node     VARCHAR(100) NOT NULL REFERENCES nodes(node_id),
  target_course   VARCHAR(50)  NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
  conditions      TEXT,                   -- เงื่อนไข เช่น 'เกรดขั้นต่ำ C+'
  approved_by     VARCHAR(200),
  approved_date   TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(source_node, source_course, target_node, target_course)
);

-- Audit Log ทุก Action ในระบบ
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action          VARCHAR(100) NOT NULL,  -- 'node.register', 'consent.approve'
  actor_node      VARCHAR(100),
  actor_did       VARCHAR(255),
  target          JSONB,
  ip_address      INET,
  user_agent      TEXT,
  result          VARCHAR(20),            -- success, failure
  error_message   TEXT,
  timestamp       TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Audit logs ใช้ TimescaleDB hypertable
SELECT create_hypertable('audit_logs', 'timestamp');
```

---

## 3. Database Schema — UniLink Node

```sql
-- ข้อมูลนักศึกษา (เก็บน้อยที่สุด)
CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      VARCHAR(20) UNIQUE NOT NULL,
  did             VARCHAR(255) UNIQUE,    -- did:web:tu.ac.th:students:6501234
  wallet_endpoint TEXT,                   -- Endpoint ส่ง VC ให้ UniWallet
  fcm_token       TEXT,                   -- Firebase token สำหรับ Push Notification
  status          VARCHAR(20) DEFAULT 'active',
  enrolled_at     TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- VC ที่ออกไปแล้วทั้งหมด
CREATE TABLE issued_vcs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vc_id           VARCHAR(255) UNIQUE NOT NULL,   -- ID ใน VC document
  student_id      VARCHAR(20) NOT NULL REFERENCES students(student_id),
  vc_type         VARCHAR(50) NOT NULL,   -- CourseCreditCredential, DegreeCredential ฯลฯ
  course_id       VARCHAR(50),
  vc_document     JSONB NOT NULL,         -- Full VC JSON
  status_index    INTEGER,                -- index ใน Status List
  status          VARCHAR(20) DEFAULT 'active',   -- active, revoked
  issued_at       TIMESTAMP WITH TIME ZONE DEFAULT now(),
  revoked_at      TIMESTAMP WITH TIME ZONE,
  revoke_reason   TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Credit Transfer Requests
CREATE TABLE credit_transfers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id     VARCHAR(100) UNIQUE NOT NULL,
  student_id      VARCHAR(20) NOT NULL REFERENCES students(student_id),
  source_vc_id    VARCHAR(255) NOT NULL,
  source_course   VARCHAR(50)  NOT NULL,
  target_node     VARCHAR(100) NOT NULL,
  target_course   VARCHAR(50),
  status          VARCHAR(20) DEFAULT 'pending',
  reviewed_by     VARCHAR(200),
  review_note     TEXT,
  transfer_vc_id  VARCHAR(255),           -- VC ที่ออกหลังอนุมัติ
  requested_at    TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at     TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Course Catalog — LIS v2.0 Course Template
CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       VARCHAR(50) UNIQUE NOT NULL,    -- 'CS101'
  course_name     VARCHAR(200) NOT NULL,
  course_name_th  VARCHAR(200),
  credits         INTEGER NOT NULL,
  course_type     VARCHAR(50),            -- Lecture, Lab, Seminar, Independent Study
  delivery_mode   VARCHAR(20),            -- Onsite, Online, Hybrid
  faculty         VARCHAR(200),
  department      VARCHAR(200),
  description     TEXT,
  description_th  TEXT,
  prerequisites   TEXT[],                 -- ['MATH101', 'CS001']
  language        VARCHAR(50),            -- Thai, English, Bilingual
  is_active       BOOLEAN DEFAULT true,
  last_synced_at  TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Course Offering — แต่ละภาคเรียน (LIS v2.0 Course Offering)
CREATE TABLE course_offerings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id     VARCHAR(100) UNIQUE NOT NULL,
  course_id       VARCHAR(50) NOT NULL REFERENCES courses(course_id),
  academic_year   VARCHAR(10) NOT NULL,   -- '2567'
  semester        VARCHAR(5)  NOT NULL,   -- '1', '2', 'S'
  section         VARCHAR(10),
  delivery_mode   VARCHAR(20),
  max_enrollment  INTEGER,
  enrolled_count  INTEGER DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'active',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Learning Outcomes — CASE v1.1 CFItem
CREATE TABLE course_outcomes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id      VARCHAR(100) UNIQUE NOT NULL,   -- UUID ตาม CASE v1.1
  course_id       VARCHAR(50) NOT NULL REFERENCES courses(course_id),
  full_statement  TEXT NOT NULL,          -- ข้อความ LO
  full_statement_th TEXT,
  coding_scheme   VARCHAR(50),            -- 'CS101-LO-01'
  education_level VARCHAR(50),            -- 'undergraduate'
  bloom_level     VARCHAR(50),            -- Remember, Understand, Apply, Analyze, Evaluate, Create
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Syllabus รายสัปดาห์
CREATE TABLE course_syllabus (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       VARCHAR(50) NOT NULL REFERENCES courses(course_id),
  week            INTEGER NOT NULL,
  topic           VARCHAR(500) NOT NULL,
  topic_th        VARCHAR(500),
  description     TEXT,
  resources       TEXT[],                 -- รายชื่อเอกสาร/ลิงก์
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(course_id, week)
);

-- ผู้สอน
CREATE TABLE course_instructors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       VARCHAR(50) NOT NULL REFERENCES courses(course_id),
  offering_id     VARCHAR(100) REFERENCES course_offerings(offering_id),
  instructor_name VARCHAR(200) NOT NULL,
  instructor_title VARCHAR(100),
  role            VARCHAR(50) DEFAULT 'Instructor',  -- Instructor, Co-Instructor, TA
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- เกณฑ์การวัดผล
CREATE TABLE course_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       VARCHAR(50) NOT NULL REFERENCES courses(course_id),
  assessment_type VARCHAR(100) NOT NULL,  -- 'Midterm Exam', 'Final Exam', 'Assignment'
  weight          INTEGER NOT NULL,       -- เปอร์เซ็นต์ (ผลรวมต้อง = 100)
  description     TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## 4. TypeScript Interfaces (packages/dto)

### VC Types
```typescript
// packages/dto/src/vc.types.ts

export interface CourseCreditSubject {
  id: string;               // DID ของนักศึกษา
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  courseNameTH?: string;
  credits: number;
  grade: string;
  gradePoint: number;
  semester: string;
  academicYear: string;
  deliveryMode: 'Onsite' | 'Online' | 'Hybrid';
  faculty?: string;
  department?: string;
  institution: string;
  institutionDID: string;
}

export interface VerifiableCredential<T = unknown> {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialStatus?: CredentialStatus;
  credentialSubject: T;
  proof?: Proof;
}

export interface CredentialStatus {
  id: string;
  type: 'StatusList2021Entry';
  statusPurpose: 'revocation';
  statusListIndex: string;
  statusListCredential: string;
}

export interface Proof {
  type: 'Ed25519Signature2020';
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
}
```

### Course Types (LIS v2.0 + CASE v1.1)
```typescript
// packages/dto/src/course.types.ts

export interface LISCourseTemplate {
  courseId: string;
  courseName: string;
  courseNameTH?: string;
  credits: number;
  courseType?: string;
  deliveryMode?: 'Onsite' | 'Online' | 'Hybrid';
  org: {
    faculty?: string;
    department?: string;
  };
  description?: string;
  descriptionTH?: string;
  prerequisites?: string[];
  language?: string;
  isActive: boolean;
  integrity?: {
    hash: string;
    signature: string;
    signingKey: string;
  };
}

export interface CASELearningOutcome {
  identifier: string;         // UUID ตาม CASE v1.1
  courseId: string;
  fullStatement: string;
  fullStatementTH?: string;
  humanCodingScheme?: string; // 'CS101-LO-01'
  educationLevel?: string;
  bloomLevel?: string;
  sortOrder?: number;
}

export interface CASEDocument {
  identifier: string;
  uri: string;
  title: string;
  courseId: string;
  lastChangeDateTime: string;
  CFItems: CASELearningOutcome[];
}
```

### API Response Types
```typescript
// packages/dto/src/api.types.ts

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export interface NodeRegistration {
  nodeId: string;
  name: string;
  nameTH?: string;
  did: string;
  publicKey: string;
  apiEndpoint: string;
  certThumbprint?: string;
}

export interface ConsentRequest {
  requesterId: string;
  studentDid: string;
  purpose: string;
  dataScope: {
    vcs?: string[];
    courses?: string[];
  };
  expiresIn: number;          // seconds
}
```
