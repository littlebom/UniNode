/**
 * Test fixtures for integration & security tests
 * Provides consistent mock data across all test suites
 */

// ─── Student ────────────────────────────────────────────

export const TEST_STUDENT = {
  studentId: '6401001',
  did: 'did:web:tu.ac.th:students:6401001',
  firstName: 'Somchai',
  lastName: 'Jaidee',
  faculty: 'Engineering',
  program: 'Computer Engineering',
}

// ─── VC Issue Request ───────────────────────────────────

export const TEST_VC_ISSUE = {
  studentId: '6401001',
  courseId: 'CS101',
  grade: 'A',
  gradePoint: 4,
  semester: '1',
  academicYear: '2569',
  deliveryMode: 'Onsite',
}

export const TEST_VC_RESPONSE = {
  vcId: 'vc-cs101-6401001-2569-1',
  status: 'issued',
  vc: {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/clr/v2p0/context',
    ],
    id: 'vc-cs101-6401001-2569-1',
    type: ['VerifiableCredential', 'AcademicCredential'],
    issuer: 'did:web:tu.ac.th',
    issuanceDate: '2026-02-23T00:00:00.000Z',
  },
  issuedAt: new Date('2026-02-23T00:00:00Z'),
  revokedAt: null,
}

// ─── Transfer ───────────────────────────────────────────

export const TEST_TRANSFER_REQUEST = {
  studentId: '6401001',
  sourceVcId: 'vc-cs101-6401001-2569-1',
  sourceCourseId: 'CS101',
  targetNodeId: 'cu.ac.th',
  targetCourseId: 'CU-CS100',
}

export const TEST_TRANSFER_RESPONSE = {
  transferId: 'txfr-tu-ac-th-cu-ac-th-6401001-001',
  studentId: '6401001',
  sourceVcId: 'vc-cs101-6401001-2569-1',
  sourceCourseId: 'CS101',
  targetNodeId: 'cu.ac.th',
  targetCourseId: 'CU-CS100',
  status: 'pending',
  createdAt: '2026-02-23T00:00:00.000Z',
}

// ─── External Credential ────────────────────────────────

export const TEST_EXTERNAL_SUBMIT = {
  studentId: '6401001',
  platform: 'Coursera',
  courseName: 'Machine Learning',
  institution: 'Stanford University',
  completionDate: '2026-01-15',
  score: 95,
  completionHours: 60,
  certificateUrl: 'https://coursera.org/verify/abc123',
}

export const TEST_EXTERNAL_DETAIL = {
  requestId: 'ext-tu-ac-th-6401001-1708000000000',
  studentId: '6401001',
  platform: 'Coursera',
  courseName: 'Machine Learning',
  institution: 'Stanford University',
  completionDate: '2026-01-15',
  score: '95',
  hours: 60,
  certificateUrl: 'https://coursera.org/verify/abc123',
  status: 'pending' as const,
  requestedAt: '2026-02-20T00:00:00.000Z',
  decidedAt: null,
}

export const TEST_EXTERNAL_APPROVE = {
  recognizedCourseId: 'CS101',
  recognizedCredits: 3,
  note: 'Verified certificate',
}

// ─── Course ─────────────────────────────────────────────

export const TEST_COURSE = {
  courseId: 'CS101',
  title: 'Introduction to Computer Science',
  credits: 3,
  faculty: 'Engineering',
  department: 'Computer Engineering',
  description: 'Fundamental concepts of CS',
}

export const TEST_COURSE_LIS = {
  sourcedId: 'CS101',
  status: 'active',
  title: 'Introduction to Computer Science',
  courseCode: 'CS101',
  credits: '3',
  org: {
    sourcedId: 'tu.ac.th',
    type: 'org',
    name: 'Thammasat University',
  },
}

export const TEST_CASE_DOCUMENT = {
  CFDocument: {
    identifier: 'CS101-outcomes',
    title: 'CS101 Learning Outcomes',
    creator: 'Thammasat University',
    lastChangeDateTime: '2026-01-01T00:00:00.000Z',
  },
  CFItems: [
    {
      identifier: 'lo-cs101-1',
      humanCodingScheme: 'CS101.LO1',
      fullStatement: 'Understand fundamental algorithms',
      CFItemType: 'Learning Outcome',
    },
  ],
}

// ─── VP (Verifiable Presentation) ───────────────────────

export const TEST_VP = {
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  type: ['VerifiablePresentation'],
  holder: 'did:web:tu.ac.th:students:6401001',
  verifiableCredential: [],
  proof: {
    type: 'Ed25519Signature2020',
    created: '2026-02-23T00:00:00.000Z',
    verificationMethod: 'did:web:tu.ac.th:students:6401001#key-1',
    proofPurpose: 'authentication',
    challenge: '00000000-0000-4000-8000-000000000001',
    proofValue: 'mock-signature-value',
  },
}

export const TEST_VP_RESULT = {
  valid: true,
  holder: 'did:web:tu.ac.th:students:6401001',
  credentials: [],
  errors: [],
}

// ─── DID Document ───────────────────────────────────────

export const TEST_DID_DOCUMENT = {
  '@context': [
    'https://www.w3.org/ns/did/v1',
    'https://w3id.org/security/suites/ed25519-2020/v1',
  ],
  id: 'did:web:tu.ac.th',
  verificationMethod: [
    {
      id: 'did:web:tu.ac.th#key-1',
      type: 'Ed25519VerificationKey2020',
      controller: 'did:web:tu.ac.th',
      publicKeyMultibase: 'z6Mktest123...',
    },
  ],
  authentication: ['did:web:tu.ac.th#key-1'],
  assertionMethod: ['did:web:tu.ac.th#key-1'],
}

// ─── Health ─────────────────────────────────────────────

export const TEST_HEALTH_RESPONSE = {
  status: 'ok',
  info: {
    memory_heap: { status: 'up' },
  },
  error: {},
  details: {
    memory_heap: { status: 'up' },
  },
}
