// ── W3C Verifiable Credentials 2.0 Types ────────────────

export interface CredentialStatus {
  id: string
  type: 'StatusList2021Entry'
  statusPurpose: 'revocation'
  statusListIndex: string
  statusListCredential: string
}

export interface Proof {
  type: 'Ed25519Signature2020'
  created: string
  verificationMethod: string
  proofPurpose: string
  proofValue: string
}

export interface VerifiableCredential<T = unknown> {
  '@context': string[]
  id: string
  type: string[]
  issuer: string
  issuanceDate: string
  expirationDate?: string
  credentialStatus?: CredentialStatus
  credentialSubject: T
  proof?: Proof
}

export interface VerifiablePresentation {
  '@context': string[]
  type: string[]
  holder: string
  verifiableCredential: VerifiableCredential[]
  proof?: Proof & {
    challenge: string
    domain: string
  }
}

export interface StatusListCredential {
  '@context': string[]
  id: string
  type: string[]
  issuer: string
  issuanceDate: string
  credentialSubject: {
    id: string
    type: 'StatusList2021'
    statusPurpose: 'revocation'
    encodedList: string
  }
  proof?: Proof
}

// ── Credential Subject Types ────────────────────────────

export interface CourseCreditSubject {
  id: string
  studentId: string
  studentName: string
  courseId: string
  courseName: string
  courseNameTH?: string
  credits: number
  grade: string
  gradePoint: number
  semester: string
  academicYear: string
  deliveryMode: 'Onsite' | 'Online' | 'Hybrid'
  faculty?: string
  department?: string
  institution: string
  institutionDID: string
}

export interface CreditTransferSubject {
  id: string
  transferType: 'CreditTransfer'
  sourceCourse: {
    courseId: string
    courseName: string
    credits: number
    grade: string
    institution: string
    institutionDID: string
    sourceVC: string
  }
  targetCourse: {
    courseId: string
    courseName: string
    credits: number
    institution: string
  }
  approvedBy: string
  approvedByDID: string
  approvedDate: string
  transferStatus: 'approved' | 'pending' | 'rejected'
  conditions?: string
}

export interface DegreeSubject {
  id: string
  degreeType: string
  degreeName: string
  major: string
  minor?: string
  totalCredits: number
  GPA: number
  honor?: string
  graduationDate: string
  institution: string
  faculty: string
}

export interface AchievementSubject {
  id: string
  achievementType: 'ExternalCertification'
  achievementName: string
  externalCredential: {
    platform: string
    courseName: string
    issuedBy: string
    originalVC?: string
    completionHours?: number
    score?: number
    verificationMethod: 'AutomaticVC' | 'ManualReview'
  }
  recognizedBy: string
  recognizedCredits: number
  recognizedCourse: string
  recognizedDate: string
  approvedBy: string
}

// ── VC Type Aliases ─────────────────────────────────────

export type CourseCreditCredential = VerifiableCredential<CourseCreditSubject>
export type CreditTransferCredential = VerifiableCredential<CreditTransferSubject>
export type DegreeCredential = VerifiableCredential<DegreeSubject>
export type AchievementCredential = VerifiableCredential<AchievementSubject>

export type VCType =
  | 'CourseCreditCredential'
  | 'CreditTransferCredential'
  | 'DegreeCredential'
  | 'AchievementCredential'
