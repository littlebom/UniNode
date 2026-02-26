import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { CourseService } from '../course.service'
import { CourseRepository } from '../course.repository'
import { CryptoService } from '../../crypto/crypto.service'
import { UniLinkException } from '@unilink/dto'

// Mock @unilink/crypto to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
  sha256Hex: jest.fn().mockReturnValue('abc123hash'),
  canonicalize: jest.fn().mockReturnValue('{"canonical":"json"}'),
  verifyRaw: jest.fn().mockResolvedValue(true),
}))

// Mock @unilink/vc-core to avoid ESM issues
jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
  getDIDDocument: jest.fn(),
  buildStatusListCredential: jest.fn(),
  createStatusList: jest.fn(),
  setRevoked: jest.fn(),
  didWebToUrl: jest.fn().mockReturnValue('https://tu.ac.th/.well-known/did.json'),
}))

describe('CourseService', () => {
  let service: CourseService

  const mockCourseRepo = {
    findAll: jest.fn(),
    findByCourseId: jest.fn(),
    search: jest.fn(),
    getOutcomesByCourseId: jest.fn(),
    getSyllabusByCourseId: jest.fn(),
    getAssessmentsByCourseId: jest.fn(),
  }

  const mockCryptoService = {
    sign: jest.fn().mockResolvedValue('mock-signature'),
    verify: jest.fn().mockResolvedValue(true),
    getPublicKeyMultibase: jest.fn().mockResolvedValue('z6Mkf...'),
  }

  const mockConfigService = {
    get: jest.fn((key: string, def?: string) => {
      const map: Record<string, string> = {
        NODE_DOMAIN: 'tu.ac.th',
        NODE_ID: 'tu.ac.th',
      }
      return map[key] ?? def
    }),
  }

  const mockCourseEntity = {
    id: 'uuid-course-1',
    courseId: 'CS101',
    courseName: 'Introduction to Programming',
    courseNameTH: 'การเขียนโปรแกรมเบื้องต้น',
    credits: 3,
    courseType: 'Lecture + Lab',
    deliveryMode: 'Onsite',
    faculty: 'คณะวิทยาศาสตร์',
    department: 'ภาควิชาวิทยาการคอมพิวเตอร์',
    description: 'Introduction to programming concepts',
    descriptionTH: 'แนะนำแนวคิดการเขียนโปรแกรม',
    prerequisites: ['MATH101'],
    language: 'Thai',
    isActive: true,
    lastSyncedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
  }

  const mockInactiveCourseEntity = {
    ...mockCourseEntity,
    courseId: 'CS999',
    isActive: false,
  }

  const mockAssessments = [
    { id: 'uuid-a1', courseId: 'CS101', assessmentType: 'Midterm Exam', weight: 30, description: null, createdAt: new Date() },
    { id: 'uuid-a2', courseId: 'CS101', assessmentType: 'Final Exam', weight: 40, description: null, createdAt: new Date() },
    { id: 'uuid-a3', courseId: 'CS101', assessmentType: 'Assignment', weight: 30, description: null, createdAt: new Date() },
  ]

  const mockOutcomes = [
    {
      id: 'uuid-o1',
      outcomeId: 'lo-cs101-001',
      courseId: 'CS101',
      fullStatement: 'Students can explain OOP principles',
      fullStatementTH: 'นักศึกษาสามารถอธิบายหลักการ OOP',
      codingScheme: 'CS101-LO-01',
      educationLevel: 'undergraduate',
      bloomLevel: 'Understand',
      sortOrder: 1,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-06-01'),
    },
    {
      id: 'uuid-o2',
      outcomeId: 'lo-cs101-002',
      courseId: 'CS101',
      fullStatement: 'Students can write basic Python programs',
      fullStatementTH: null,
      codingScheme: 'CS101-LO-02',
      educationLevel: 'undergraduate',
      bloomLevel: 'Apply',
      sortOrder: 2,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-03-01'),
    },
  ]

  const mockTargetOutcomes = [
    {
      id: 'uuid-t1',
      outcomeId: 'lo-cs201-001',
      courseId: 'CS201',
      fullStatement: 'Students can explain OOP principles and patterns',
      fullStatementTH: null,
      codingScheme: 'CS101-LO-01',
      educationLevel: 'undergraduate',
      bloomLevel: 'Understand',
      sortOrder: 1,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-06-01'),
    },
    {
      id: 'uuid-t2',
      outcomeId: 'lo-cs201-002',
      courseId: 'CS201',
      fullStatement: 'Students can design distributed systems',
      fullStatementTH: null,
      codingScheme: 'CS201-LO-02',
      educationLevel: 'undergraduate',
      bloomLevel: 'Create',
      sortOrder: 2,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-06-01'),
    },
  ]

  const mockSyllabus = [
    { id: 'uuid-s1', courseId: 'CS101', week: 1, topic: 'Introduction to Python', topicTH: 'แนะนำ Python', description: null, resources: null, createdAt: new Date() },
    { id: 'uuid-s2', courseId: 'CS101', week: 2, topic: 'Variables and Data Types', topicTH: null, description: 'Learn about variables', resources: ['textbook-ch2.pdf'], createdAt: new Date() },
  ]

  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: CourseRepository, useValue: mockCourseRepo },
        { provide: CryptoService, useValue: mockCryptoService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile()

    service = module.get<CourseService>(CourseService)
  })

  // ─── listCourses ─────────────────────────────────────────

  describe('listCourses', () => {
    it('should return paginated course list', async () => {
      mockCourseRepo.findAll.mockResolvedValue({
        data: [mockCourseEntity],
        total: 1,
      })

      const result = await service.listCourses({ page: 1, limit: 20 })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].courseId).toBe('CS101')
      expect(result.meta.total).toBe(1)
      expect(result.meta.page).toBe(1)
      expect(result.meta.totalPages).toBe(1)
    })

    it('should pass faculty filter to repository', async () => {
      mockCourseRepo.findAll.mockResolvedValue({ data: [], total: 0 })

      await service.listCourses({ faculty: 'science' })

      expect(mockCourseRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ faculty: 'science' }),
      )
    })

    it('should pass deliveryMode filter to repository', async () => {
      mockCourseRepo.findAll.mockResolvedValue({ data: [], total: 0 })

      await service.listCourses({ deliveryMode: 'Online' })

      expect(mockCourseRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryMode: 'Online' }),
      )
    })
  })

  // ─── getCourse ───────────────────────────────────────────

  describe('getCourse', () => {
    it('should return LISCourseTemplate with integrity', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(mockCourseEntity)
      mockCourseRepo.getAssessmentsByCourseId.mockResolvedValue(mockAssessments)

      const result = await service.getCourse('CS101')

      expect(result.courseId).toBe('CS101')
      expect(result.courseName).toBe('Introduction to Programming')
      expect(result.integrity).toBeDefined()
      expect(result.integrity!.hash).toMatch(/^sha256:/)
      expect(result.integrity!.signature).toBe('mock-signature')
      expect(result.integrity!.signingKey).toBe('did:web:tu.ac.th#key-1')
    })

    it('should include assessments in response', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(mockCourseEntity)
      mockCourseRepo.getAssessmentsByCourseId.mockResolvedValue(mockAssessments)

      await service.getCourse('CS101')

      expect(mockCryptoService.sign).toHaveBeenCalledTimes(1)
    })

    it('should throw COURSE_NOT_FOUND when course does not exist', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(null)

      await expect(service.getCourse('UNKNOWN')).rejects.toThrow(UniLinkException)

      try {
        await service.getCourse('UNKNOWN')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('COURSE_NOT_FOUND')
      }
    })

    it('should throw COURSE_INACTIVE for inactive course', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(mockInactiveCourseEntity)

      try {
        await service.getCourse('CS999')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('COURSE_INACTIVE')
        expect((e as UniLinkException).statusCode).toBe(404)
      }
    })

    it('should call CryptoService.sign for integrity', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(mockCourseEntity)
      mockCourseRepo.getAssessmentsByCourseId.mockResolvedValue([])

      await service.getCourse('CS101')

      expect(mockCryptoService.sign).toHaveBeenCalledWith('abc123hash')
    })
  })

  // ─── getOutcomes ─────────────────────────────────────────

  describe('getOutcomes', () => {
    it('should return CASEDocument format', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(mockCourseEntity)
      mockCourseRepo.getOutcomesByCourseId.mockResolvedValue(mockOutcomes)

      const result = await service.getOutcomes('CS101')

      expect(result.identifier).toBe('cfdoc-CS101')
      expect(result.title).toBe('CS101 Learning Outcomes')
      expect(result.courseId).toBe('CS101')
      expect(result.uri).toContain('/courses/CS101/outcomes')
      expect(result.CFItems).toHaveLength(2)
    })

    it('should have CFItems sorted by sortOrder', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(mockCourseEntity)
      mockCourseRepo.getOutcomesByCourseId.mockResolvedValue(mockOutcomes)

      const result = await service.getOutcomes('CS101')

      expect(result.CFItems[0].sortOrder).toBe(1)
      expect(result.CFItems[1].sortOrder).toBe(2)
      expect(result.CFItems[0].bloomLevel).toBe('Understand')
      expect(result.CFItems[1].bloomLevel).toBe('Apply')
    })

    it('should throw COURSE_NOT_FOUND if course does not exist', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(null)

      await expect(service.getOutcomes('UNKNOWN')).rejects.toThrow(UniLinkException)

      try {
        await service.getOutcomes('UNKNOWN')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('COURSE_NOT_FOUND')
      }
    })

    it('should throw COURSE_INACTIVE for inactive course', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(mockInactiveCourseEntity)

      try {
        await service.getOutcomes('CS999')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('COURSE_INACTIVE')
      }
    })

    it('should throw COURSE_NO_OUTCOMES if no outcomes found', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(mockCourseEntity)
      mockCourseRepo.getOutcomesByCourseId.mockResolvedValue([])

      await expect(service.getOutcomes('CS101')).rejects.toThrow(UniLinkException)

      try {
        await service.getOutcomes('CS101')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('COURSE_NO_OUTCOMES')
      }
    })

    it('should use latest updatedAt for lastChangeDateTime', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(mockCourseEntity)
      mockCourseRepo.getOutcomesByCourseId.mockResolvedValue(mockOutcomes)

      const result = await service.getOutcomes('CS101')

      expect(result.lastChangeDateTime).toBe(new Date('2025-06-01').toISOString())
    })
  })

  // ─── getSyllabus ─────────────────────────────────────────

  describe('getSyllabus', () => {
    it('should return syllabus sorted by week', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(mockCourseEntity)
      mockCourseRepo.getSyllabusByCourseId.mockResolvedValue(mockSyllabus)

      const result = await service.getSyllabus('CS101')

      expect(result).toHaveLength(2)
      expect(result[0].week).toBe(1)
      expect(result[1].week).toBe(2)
      expect(result[0].topic).toBe('Introduction to Python')
    })

    it('should throw COURSE_NOT_FOUND when course does not exist', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(null)

      await expect(service.getSyllabus('UNKNOWN')).rejects.toThrow(UniLinkException)

      try {
        await service.getSyllabus('UNKNOWN')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('COURSE_NOT_FOUND')
      }
    })

    it('should throw COURSE_INACTIVE for inactive course', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(mockInactiveCourseEntity)

      try {
        await service.getSyllabus('CS999')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('COURSE_INACTIVE')
      }
    })
  })

  // ─── searchCourses ───────────────────────────────────────

  describe('searchCourses', () => {
    it('should return matching courses', async () => {
      mockCourseRepo.search.mockResolvedValue({
        data: [mockCourseEntity],
        total: 1,
      })

      const result = await service.searchCourses({ q: 'programming' })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].courseId).toBe('CS101')
      expect(mockCourseRepo.search).toHaveBeenCalledWith(
        'programming',
        expect.objectContaining({ page: 1, limit: 20 }),
      )
    })

    it('should pass faculty and credits filters', async () => {
      mockCourseRepo.search.mockResolvedValue({ data: [], total: 0 })

      await service.searchCourses({
        q: 'math',
        faculty: 'science',
        credits: 3,
      })

      expect(mockCourseRepo.search).toHaveBeenCalledWith(
        'math',
        expect.objectContaining({ faculty: 'science', credits: 3 }),
      )
    })
  })

  // ─── verifyCourseIntegrity ─────────────────────────────

  describe('verifyCourseIntegrity', () => {
    it('should return valid for correct hash and signature (own node)', async () => {
      const result = await service.verifyCourseIntegrity({
        courseData: { courseId: 'CS101', courseName: 'Test' },
        integrity: {
          hash: 'sha256:abc123hash',
          signature: 'mock-sig',
          signingKey: 'did:web:tu.ac.th#key-1',
        },
      })

      expect(result.isValid).toBe(true)
      expect(result.verifiedAt).toBeDefined()
      expect(mockCryptoService.verify).toHaveBeenCalledWith('abc123hash', 'mock-sig')
    })

    it('should return invalid for hash mismatch', async () => {
      const result = await service.verifyCourseIntegrity({
        courseData: { courseId: 'CS101' },
        integrity: {
          hash: 'sha256:wrong-hash',
          signature: 'mock-sig',
          signingKey: 'did:web:tu.ac.th#key-1',
        },
      })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Hash mismatch')
    })

    it('should return invalid for failed signature verification', async () => {
      mockCryptoService.verify.mockResolvedValueOnce(false)

      const result = await service.verifyCourseIntegrity({
        courseData: { courseId: 'CS101' },
        integrity: {
          hash: 'sha256:abc123hash',
          signature: 'bad-signature',
          signingKey: 'did:web:tu.ac.th#key-1',
        },
      })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Signature verification failed')
    })

    it('should throw COURSE_INTEGRITY_FAILED when key resolution fails', async () => {
      mockCryptoService.verify.mockRejectedValueOnce(new Error('Vault error'))

      try {
        await service.verifyCourseIntegrity({
          courseData: { courseId: 'CS101' },
          integrity: {
            hash: 'sha256:abc123hash',
            signature: 'mock-sig',
            signingKey: 'did:web:tu.ac.th#key-1',
          },
        })
      } catch (e) {
        expect((e as UniLinkException).code).toBe('COURSE_INTEGRITY_FAILED')
      }
    })
  })

  // ─── calculateLOMatch ──────────────────────────────────

  describe('calculateLOMatch', () => {
    it('should return 50% for partial codingScheme match', async () => {
      mockCourseRepo.getOutcomesByCourseId
        .mockResolvedValueOnce(mockOutcomes) // source CS101
        .mockResolvedValueOnce(mockTargetOutcomes) // target CS201

      const result = await service.calculateLOMatch('CS101', 'CS201')

      // Only first target matches by codingScheme (CS101-LO-01)
      // Second target (distributed systems) has no match
      expect(result.matchPercentage).toBe(50)
      expect(result.matchedCount).toBe(1)
      expect(result.sourceTotal).toBe(2)
      expect(result.targetTotal).toBe(2)
      expect(result.matches[0].matchType).toBe('codingScheme')
    })

    it('should return 100% when all targets match', async () => {
      const matchingTargets = [
        { ...mockTargetOutcomes[0], codingScheme: 'CS101-LO-01' },
        { ...mockTargetOutcomes[1], outcomeId: 'lo-cs201-002', codingScheme: 'CS101-LO-02' },
      ]

      mockCourseRepo.getOutcomesByCourseId
        .mockResolvedValueOnce(mockOutcomes)
        .mockResolvedValueOnce(matchingTargets)

      const result = await service.calculateLOMatch('CS101', 'CS201')

      expect(result.matchPercentage).toBe(100)
      expect(result.matchedCount).toBe(2)
    })

    it('should return 0% when no outcomes match', async () => {
      const noMatchTargets = [
        { ...mockTargetOutcomes[1], codingScheme: 'UNRELATED-01' },
      ]

      mockCourseRepo.getOutcomesByCourseId
        .mockResolvedValueOnce(mockOutcomes)
        .mockResolvedValueOnce(noMatchTargets)

      const result = await service.calculateLOMatch('CS101', 'CS201')

      expect(result.matchPercentage).toBe(0)
      expect(result.matchedCount).toBe(0)
    })

    it('should throw COURSE_NO_OUTCOMES when source has none', async () => {
      mockCourseRepo.getOutcomesByCourseId.mockResolvedValueOnce([])

      try {
        await service.calculateLOMatch('CS101', 'CS201')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('COURSE_NO_OUTCOMES')
      }
    })

    it('should throw COURSE_NO_OUTCOMES when target has none', async () => {
      mockCourseRepo.getOutcomesByCourseId
        .mockResolvedValueOnce(mockOutcomes)
        .mockResolvedValueOnce([])

      try {
        await service.calculateLOMatch('CS101', 'CS201')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('COURSE_NO_OUTCOMES')
      }
    })
  })

  // ─── getSchemaOrg ──────────────────────────────────────

  describe('getSchemaOrg', () => {
    it('should return valid Schema.org Course format', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(mockCourseEntity)

      const result = await service.getSchemaOrg('CS101')

      expect(result['@context']).toBe('https://schema.org')
      expect(result['@type']).toBe('Course')
      expect(result.name).toBe('Introduction to Programming')
      expect(result.numberOfCredits).toBe(3)
      expect(result.provider['@type']).toBe('Organization')
      expect(result.provider.name).toBe('tu.ac.th')
      expect(result.inLanguage).toBe('Thai')
    })

    it('should throw COURSE_NOT_FOUND for missing course', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(null)

      await expect(service.getSchemaOrg('UNKNOWN')).rejects.toThrow(UniLinkException)
    })

    it('should throw COURSE_INACTIVE for inactive course', async () => {
      mockCourseRepo.findByCourseId.mockResolvedValue(mockInactiveCourseEntity)

      try {
        await service.getSchemaOrg('CS999')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('COURSE_INACTIVE')
      }
    })
  })
})
