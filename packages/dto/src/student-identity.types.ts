/**
 * Student Identity types for Hybrid DID architecture.
 *
 * These types are shared between UniRegistry (Identity Provider)
 * and UniNode (Resource Server).
 */

// ─── Student Identity (Registry-managed) ─────────────────────────

export interface StudentIdentity {
  /** Internal UUID */
  id: string
  /** Primary DID: did:web:unilink.ac.th:id:{uuid} */
  didWeb: string
  /** Fallback DID: did:key:z6Mk... (derived from public key) */
  didKey: string
  /** Ed25519 public key in multibase format (z + base64) */
  publicKey: string
  /** Identity status */
  status: 'active' | 'suspended' | 'revoked'
  createdAt: string
  updatedAt: string
}

// ─── Student Enrollment (per Node) ───────────────────────────────

export interface StudentEnrollment {
  id: string
  /** FK → student_identities.id */
  identityId: string
  /** Node identifier (e.g., 'tu.ac.th') */
  nodeId: string
  /** Local student ID at the institution (e.g., '6501234') */
  localStudentId: string
  /** Enrollment status */
  status: 'active' | 'graduated' | 'withdrawn' | 'suspended'
  enrolledAt: string | null
  createdAt: string
}

// ─── Student JWT Payload (issued by Registry) ────────────────────

export interface StudentJwtPayload {
  /** student_identities.id (UUID) */
  sub: string
  /** did:web:unilink.ac.th:id:{uuid} */
  did: string
  /** Always 'student' for student tokens */
  role: 'student'
  /** Active enrollments at various nodes */
  enrollments?: Array<{
    nodeId: string
    localStudentId: string
    status: string
  }>
  iat?: number
  exp?: number
}

// ─── Challenge-Response Authentication ───────────────────────────

export interface StudentChallengeRequest {
  /** Student's did:web identifier */
  did: string
}

export interface StudentChallengeResponse {
  /** Random nonce (hex-encoded) */
  challenge: string
  /** When the challenge expires (ISO 8601) */
  expiresAt: string
}

export interface VerifyRequest {
  /** Student's did:web identifier */
  did: string
  /** Ed25519 signature of the challenge (base64url) */
  signature: string
}

export interface VerifyResponse {
  /** JWT access token */
  accessToken: string
  /** Opaque refresh token */
  refreshToken: string
  /** Token expiry in seconds */
  expiresIn: number
  /** Always 'Bearer' */
  tokenType: string
}

// ─── Registration ────────────────────────────────────────────────

export interface RegisterStudentIdentityRequest {
  /** Ed25519 public key in multibase format (z + base64) */
  publicKey: string
  /** First institution to enroll at */
  nodeId: string
  /** Local student ID at that institution */
  localStudentId: string
}

export interface RegisterStudentIdentityResponse {
  /** Internal UUID */
  id: string
  /** Primary DID: did:web:unilink.ac.th:id:{uuid} */
  didWeb: string
  /** Fallback DID: did:key:z6Mk... */
  didKey: string
}

// ─── Enrollment Management ───────────────────────────────────────

export interface AddEnrollmentRequest {
  /** Node to enroll at (e.g., 'cu.ac.th') */
  nodeId: string
  /** Local student ID at the new institution */
  localStudentId: string
}

export interface StudentIdentityWithEnrollments extends StudentIdentity {
  enrollments: StudentEnrollment[]
}
