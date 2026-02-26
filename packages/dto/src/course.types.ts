// ── 1EdTech LIS v2.0 — Course Template ──────────────────

export interface LISCourseTemplate {
  courseId: string
  courseName: string
  courseNameTH?: string
  credits: number
  courseType?: string
  deliveryMode?: 'Onsite' | 'Online' | 'Hybrid'
  org: {
    faculty?: string
    department?: string
  }
  description?: string
  descriptionTH?: string
  prerequisites?: string[]
  language?: string
  isActive: boolean
  integrity?: CourseIntegrity
}

export interface CourseIntegrity {
  hash: string
  signature: string
  signingKey: string
}

export interface LISCourseOffering {
  offeringId: string
  courseId: string
  academicYear: string
  semester: string
  section?: string
  deliveryMode?: 'Onsite' | 'Online' | 'Hybrid'
  maxEnrollment?: number
  enrolledCount: number
  status: 'active' | 'cancelled' | 'completed'
}

// ── 1EdTech CASE v1.1 — Learning Outcomes ───────────────

export type BloomLevel =
  | 'Remember'
  | 'Understand'
  | 'Apply'
  | 'Analyze'
  | 'Evaluate'
  | 'Create'

export interface CASELearningOutcome {
  identifier: string
  courseId: string
  fullStatement: string
  fullStatementTH?: string
  humanCodingScheme?: string
  educationLevel?: string
  bloomLevel?: BloomLevel
  sortOrder?: number
}

export interface CASEDocument {
  identifier: string
  uri: string
  title: string
  courseId: string
  lastChangeDateTime: string
  CFItems: CASELearningOutcome[]
}

// ── Course Syllabus ─────────────────────────────────────

export interface CourseSyllabus {
  courseId: string
  week: number
  topic: string
  topicTH?: string
  description?: string
  resources?: string[]
}

export interface CourseInstructor {
  courseId: string
  offeringId?: string
  instructorName: string
  instructorTitle?: string
  role: 'Instructor' | 'Co-Instructor' | 'TA'
}

export interface CourseAssessment {
  courseId: string
  assessmentType: string
  weight: number
  description?: string
}

// ── schema.org/Course (External API) ────────────────────

export interface SchemaOrgCourse {
  '@context': 'https://schema.org'
  '@type': 'Course'
  name: string
  description?: string
  provider: {
    '@type': 'Organization'
    name: string
    url: string
  }
  numberOfCredits: number
  educationalLevel?: string
  inLanguage?: string
  hasCourseInstance?: {
    '@type': 'CourseInstance'
    courseMode: string
    startDate?: string
    endDate?: string
  }[]
}
