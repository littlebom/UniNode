// ── API Response Types ──────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    messageTH?: string
    details?: unknown
    traceId?: string
  }
  timestamp: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// ── Registry API Types ──────────────────────────────────

export interface NodeRegistration {
  nodeId: string
  name: string
  nameEN?: string
  did: string
  publicKey: string
  apiEndpoint: string
  certThumbprint?: string
}

export interface NodeInfo {
  id: string
  nodeId: string
  name: string
  nameEN?: string
  did: string
  publicKey: string
  apiEndpoint: string
  status: 'active' | 'suspended' | 'revoked'
  joinedAt: string
}

export interface ConsentRequest {
  requesterId: string
  studentDid: string
  purpose: string
  dataScope: {
    vcs?: string[]
    courses?: string[]
  }
  expiresIn: number
}

export interface ConsentResponse {
  id: string
  requesterNode: string
  studentDid: string
  purpose: string
  dataScope: {
    vcs?: string[]
    courses?: string[]
  }
  status: 'pending' | 'approved' | 'denied' | 'revoked' | 'expired'
  token?: string
  tokenExpiresAt?: string
  expiresAt: string
  createdAt: string
}

export interface AggregateData {
  courseId: string
  nodeId: string
  academicYear: string
  semester: string
  enrolledCount: number
  passedCount: number
  passRate: number
  avgGradePoint: number
}

export interface AggregateSubmission {
  nodeId: string
  academicYear: string
  semester: string
  courses: AggregateCourseStat[]
}

export interface AggregateCourseStat {
  courseId: string
  enrolledCount: number
  passedCount: number
  avgGradePoint: number
}

export interface AggregateSubmitResult {
  aggregateId: string
  nodeId: string
  status: 'received' | 'processing' | 'completed' | 'failed'
}

// ── Course Index Types ────────────────────────────────────

export interface CourseIndexEntry {
  courseId: string
  courseName: string
  courseNameTH?: string
  nodeId: string
  credits: number
  faculty?: string
  department?: string
  detailUrl: string
}

export interface CourseEquivalencyEntry {
  sourceCourse: string
  sourceNode: string
  targetCourse: string
  targetNode: string
  status: 'pending' | 'approved' | 'rejected'
  conditions?: string
  approvedBy?: string
  approvedDate?: string
}

// ── Node API Types ──────────────────────────────────────

export interface VCIssueRequest {
  studentId: string
  vcType?: string
  courseId: string
  grade: string
  gradePoint: number
  semester: string
  academicYear: string
  deliveryMode?: 'Onsite' | 'Online' | 'Hybrid'
}

export interface VCIssueResponse {
  vcId: string
  vc: Record<string, unknown>
  issuedAt: string
}

export interface TransferRequest {
  studentId: string
  sourceVcId: string
  sourceCourse: string
  targetNode: string
  targetCourse?: string
}

export interface TransferResponse {
  id: string
  transferId: string
  studentId: string
  sourceVcId: string
  sourceCourse: string
  targetNode: string
  targetCourse?: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewNote?: string
  transferVcId?: string
  requestedAt: string
  reviewedAt?: string
}

export interface ChallengeRequest {
  domain: string
}

export interface ChallengeResponse {
  challenge: string
  expiresAt: string
}

// ── External Credential Types ───────────────────────────

export interface ExternalListItem {
  requestId: string
  studentId: string
  platform: string
  courseName: string
  institution: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
}

export interface ExternalDetail {
  requestId: string
  studentId: string
  platform: string
  courseName: string
  institution: string
  completionDate: string
  score?: string | null
  hours?: number | null
  certificateUrl?: string | null
  certificatePdfUrl?: string | null
  verificationUrl?: string | null
  requestedCourseId?: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewNote?: string | null
  recognizedCourseId?: string | null
  recognizedCredits?: number | null
  requestedAt: string
  decidedAt?: string | null
}

// ── Health Check Types ──────────────────────────────────

export interface HealthStatus {
  status: 'ok' | 'error'
  info?: Record<string, { status: string }>
  error?: Record<string, { status: string; message?: string }>
  details?: Record<string, { status: string }>
}
