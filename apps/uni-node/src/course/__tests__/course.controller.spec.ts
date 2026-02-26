import { Test, TestingModule } from '@nestjs/testing'
import { CourseController } from '../course.controller'
import { CourseService } from '../course.service'
import type { LOMatchResult } from '../course.service'
import { UniLinkException } from '@unilink/dto'
import type { LISCourseTemplate, CASEDocument, CourseSyllabus, SchemaOrgCourse, PaginatedResponse } from '@unilink/dto'

// Mock packages to avoid ESM dependency issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
  sha256Hex: jest.fn(),
  canonicalize: jest.fn(),
  verifyRaw: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
  getDIDDocument: jest.fn(),
  buildStatusListCredential: jest.fn(),
  createStatusList: jest.fn(),
  setRevoked: jest.fn(),
  didWebToUrl: jest.fn(),
}))

describe('CourseController', () => {
  let controller: CourseController
  let courseService: jest.Mocked<CourseService>

  const mockCourseTemplate: LISCourseTemplate = {
    courseId: 'CS101',
    courseName: 'Introduction to Programming',
    courseNameTH: 'การเขียนโปรแกรมเบื้องต้น',
    credits: 3,
    courseType: 'Lecture + Lab',
    deliveryMode: 'Onsite',
    org: {
      faculty: 'คณะวิทยาศาสตร์',
      department: 'ภาควิชาวิทยาการคอมพิวเตอร์',
    },
    description: 'Introduction to programming concepts',
    isActive: true,
  }

  const mockCourseWithIntegrity: LISCourseTemplate = {
    ...mockCourseTemplate,
    integrity: {
      hash: 'sha256:abc123hash',
      signature: 'mock-signature',
      signingKey: 'did:web:tu.ac.th#key-1',
    },
  }

  const mockPaginatedCourses: PaginatedResponse<LISCourseTemplate> = {
    data: [mockCourseTemplate],
    meta: {
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  }

  const mockCASEDocument: CASEDocument = {
    identifier: 'cfdoc-CS101',
    uri: 'https://tu.ac.th/unilink/api/v1/courses/CS101/outcomes',
    title: 'CS101 Learning Outcomes',
    courseId: 'CS101',
    lastChangeDateTime: '2025-06-01T00:00:00.000Z',
    CFItems: [
      {
        identifier: 'lo-cs101-001',
        courseId: 'CS101',
        fullStatement: 'Students can explain OOP principles',
        bloomLevel: 'Understand',
        sortOrder: 1,
      },
    ],
  }

  const mockSyllabus: CourseSyllabus[] = [
    { courseId: 'CS101', week: 1, topic: 'Introduction to Python' },
    { courseId: 'CS101', week: 2, topic: 'Variables and Data Types' },
  ]

  const mockSchemaOrg: SchemaOrgCourse = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'Introduction to Programming',
    description: 'Introduction to programming concepts',
    provider: {
      '@type': 'Organization',
      name: 'tu.ac.th',
      url: 'https://tu.ac.th',
    },
    numberOfCredits: 3,
    educationalLevel: 'undergraduate',
    inLanguage: 'Thai',
  }

  const mockLOMatchResult: LOMatchResult = {
    matchPercentage: 50,
    matchedCount: 1,
    sourceTotal: 2,
    targetTotal: 2,
    matches: [
      {
        sourceOutcomeId: 'lo-cs101-001',
        targetOutcomeId: 'lo-cs201-001',
        sourceStatement: 'Students can explain OOP principles',
        targetStatement: 'Students can explain OOP principles and patterns',
        matchType: 'codingScheme',
        bloomMatch: true,
      },
    ],
  }

  beforeEach(async () => {
    const mockService = {
      listCourses: jest.fn(),
      searchCourses: jest.fn(),
      getCourse: jest.fn(),
      getOutcomes: jest.fn(),
      getSyllabus: jest.fn(),
      verifyCourseIntegrity: jest.fn(),
      getSchemaOrg: jest.fn(),
      calculateLOMatch: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [
        { provide: CourseService, useValue: mockService },
      ],
    }).compile()

    controller = module.get<CourseController>(CourseController)
    courseService = module.get(CourseService)
  })

  // ─── GET /courses ──────────────────────────────────────────

  describe('GET /courses', () => {
    it('should return paginated course list in ApiResponse', async () => {
      courseService.listCourses.mockResolvedValue(mockPaginatedCourses)

      const result = await controller.listCourses({})

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPaginatedCourses)
      expect(result.timestamp).toBeDefined()
    })

    it('should pass filters to service', async () => {
      courseService.listCourses.mockResolvedValue(mockPaginatedCourses)

      const dto = { faculty: 'science', deliveryMode: 'Online', page: 2, limit: 10 }
      await controller.listCourses(dto)

      expect(courseService.listCourses).toHaveBeenCalledWith(dto)
    })
  })

  // ─── POST /courses/verify-integrity ─────────────────────────

  describe('POST /courses/verify-integrity', () => {
    it('should return verification result in ApiResponse', async () => {
      courseService.verifyCourseIntegrity.mockResolvedValue({
        isValid: true,
        verifiedAt: '2026-02-23T00:00:00.000Z',
      })

      const result = await controller.verifyCourseIntegrity({
        courseData: { courseId: 'CS101' },
        integrity: { hash: 'sha256:abc', signature: 'sig', signingKey: 'did:web:tu.ac.th#key-1' },
      })

      expect(result.success).toBe(true)
      expect(result.data!.isValid).toBe(true)
      expect(result.timestamp).toBeDefined()
    })

    it('should propagate COURSE_INTEGRITY_FAILED exception', async () => {
      courseService.verifyCourseIntegrity.mockRejectedValue(
        new UniLinkException('COURSE_INTEGRITY_FAILED', 400, 'Verification failed'),
      )

      await expect(
        controller.verifyCourseIntegrity({
          courseData: {},
          integrity: { hash: 'x', signature: 'y', signingKey: 'z' },
        }),
      ).rejects.toThrow(UniLinkException)
    })
  })

  // ─── GET /courses/search ───────────────────────────────────

  describe('GET /courses/search', () => {
    it('should return search results in ApiResponse', async () => {
      courseService.searchCourses.mockResolvedValue(mockPaginatedCourses)

      const result = await controller.searchCourses({ q: 'programming' })

      expect(result.success).toBe(true)
      expect(result.data!.data).toHaveLength(1)
      expect(result.data!.data[0].courseId).toBe('CS101')
      expect(result.timestamp).toBeDefined()
    })

    it('should pass query params to service', async () => {
      courseService.searchCourses.mockResolvedValue(mockPaginatedCourses)

      const dto = { q: 'math', faculty: 'science', credits: 3 }
      await controller.searchCourses(dto)

      expect(courseService.searchCourses).toHaveBeenCalledWith(dto)
    })
  })

  // ─── GET /courses/:courseId ────────────────────────────────

  describe('GET /courses/:courseId', () => {
    it('should return LISCourseTemplate with integrity in ApiResponse', async () => {
      courseService.getCourse.mockResolvedValue(mockCourseWithIntegrity)

      const result = await controller.getCourse('CS101')

      expect(result.success).toBe(true)
      expect(result.data?.courseId).toBe('CS101')
      expect(result.data?.integrity).toBeDefined()
      expect(result.data?.integrity?.hash).toMatch(/^sha256:/)
      expect(result.timestamp).toBeDefined()
    })

    it('should propagate COURSE_NOT_FOUND exception', async () => {
      courseService.getCourse.mockRejectedValue(
        new UniLinkException('COURSE_NOT_FOUND', 404, 'Course not found'),
      )

      await expect(controller.getCourse('UNKNOWN')).rejects.toThrow(UniLinkException)
    })
  })

  // ─── GET /courses/:courseId/outcomes ────────────────────────

  describe('GET /courses/:courseId/outcomes', () => {
    it('should return CASEDocument in ApiResponse', async () => {
      courseService.getOutcomes.mockResolvedValue(mockCASEDocument)

      const result = await controller.getOutcomes('CS101')

      expect(result.success).toBe(true)
      expect(result.data?.identifier).toBe('cfdoc-CS101')
      expect(result.data?.CFItems).toHaveLength(1)
      expect(result.data?.courseId).toBe('CS101')
      expect(result.timestamp).toBeDefined()
    })

    it('should propagate COURSE_NOT_FOUND exception for outcomes', async () => {
      courseService.getOutcomes.mockRejectedValue(
        new UniLinkException('COURSE_NOT_FOUND', 404, 'Course not found'),
      )

      await expect(controller.getOutcomes('UNKNOWN')).rejects.toThrow(UniLinkException)
    })
  })

  // ─── GET /courses/:courseId/syllabus ────────────────────────

  describe('GET /courses/:courseId/syllabus', () => {
    it('should return syllabus array in ApiResponse', async () => {
      courseService.getSyllabus.mockResolvedValue(mockSyllabus)

      const result = await controller.getSyllabus('CS101')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.[0].week).toBe(1)
      expect(result.data?.[1].week).toBe(2)
      expect(result.timestamp).toBeDefined()
    })

    it('should propagate COURSE_NOT_FOUND exception for syllabus', async () => {
      courseService.getSyllabus.mockRejectedValue(
        new UniLinkException('COURSE_NOT_FOUND', 404, 'Course not found'),
      )

      await expect(controller.getSyllabus('UNKNOWN')).rejects.toThrow(UniLinkException)
    })
  })

  // ─── GET /courses/:courseId/schema ──────────────────────────

  describe('GET /courses/:courseId/schema', () => {
    it('should return Schema.org Course in ApiResponse', async () => {
      courseService.getSchemaOrg.mockResolvedValue(mockSchemaOrg)

      const result = await controller.getSchemaOrg('CS101')

      expect(result.success).toBe(true)
      expect(result.data?.['@context']).toBe('https://schema.org')
      expect(result.data?.['@type']).toBe('Course')
      expect(result.data?.name).toBe('Introduction to Programming')
      expect(result.timestamp).toBeDefined()
    })

    it('should propagate COURSE_NOT_FOUND exception for schema', async () => {
      courseService.getSchemaOrg.mockRejectedValue(
        new UniLinkException('COURSE_NOT_FOUND', 404, 'Course not found'),
      )

      await expect(controller.getSchemaOrg('UNKNOWN')).rejects.toThrow(UniLinkException)
    })
  })

  // ─── GET /courses/:courseId/lo-match ────────────────────────

  describe('GET /courses/:courseId/lo-match', () => {
    it('should return LO match result in ApiResponse', async () => {
      courseService.calculateLOMatch.mockResolvedValue(mockLOMatchResult)

      const result = await controller.calculateLOMatch('CS101', { targetCourseId: 'CS201' })

      expect(result.success).toBe(true)
      expect(result.data!.matchPercentage).toBe(50)
      expect(result.data!.matchedCount).toBe(1)
      expect(result.data!.matches).toHaveLength(1)
      expect(result.timestamp).toBeDefined()
    })

    it('should pass correct params to service', async () => {
      courseService.calculateLOMatch.mockResolvedValue(mockLOMatchResult)

      await controller.calculateLOMatch('CS101', { targetCourseId: 'CS201' })

      expect(courseService.calculateLOMatch).toHaveBeenCalledWith('CS101', 'CS201')
    })
  })
})
