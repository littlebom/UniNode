import { Test, TestingModule } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { ConfigService } from '@nestjs/config'
import { CourseService } from '../course.service'
import { CourseRepository } from '../course.repository'
import { CryptoService } from '../../crypto/crypto.service'

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
  didWebToUrl: jest.fn().mockReturnValue('https://localhost/.well-known/did.json'),
}))

describe('CourseService — Caching', () => {
  let service: CourseService
  let repository: jest.Mocked<CourseRepository>
  let cacheManager: {
    get: jest.Mock
    set: jest.Mock
    del: jest.Mock
    reset: jest.Mock
  }

  const mockCourseEntity = {
    id: 'uuid-1',
    courseId: 'CS101',
    courseName: 'Intro to CS',
    courseNameTH: 'วิทยาการคอมพิวเตอร์',
    credits: 3,
    courseType: 'lecture',
    deliveryMode: 'Onsite',
    faculty: 'Engineering',
    department: 'CS',
    description: 'An intro course',
    descriptionTH: 'วิชาเบื้องต้น',
    prerequisites: [],
    language: 'th',
    isActive: true,
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockOutcome = {
    id: 'uuid-out-1',
    outcomeId: 'LO-CS101-01',
    courseId: 'CS101',
    fullStatement: 'Understand basic programming concepts and data structures',
    fullStatementTH: 'เข้าใจแนวคิดการเขียนโปรแกรมพื้นฐาน',
    codingScheme: 'CS-PLO-01',
    educationLevel: 'undergraduate',
    bloomLevel: 'understand',
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockSyllabus = {
    id: 'uuid-syl-1',
    courseId: 'CS101',
    week: 1,
    topic: 'Introduction',
    topicTH: 'บทนำ',
    description: 'Course overview',
    resources: ['textbook ch1'],
    createdAt: new Date(),
  }

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
    }

    const mockRepo = {
      findAll: jest.fn(),
      findByCourseId: jest.fn(),
      getAssessmentsByCourseId: jest.fn(),
      getOutcomesByCourseId: jest.fn(),
      getSyllabusByCourseId: jest.fn(),
      search: jest.fn(),
    }

    const mockCrypto = {
      sign: jest.fn().mockResolvedValue('mock-signature'),
      verify: jest.fn().mockResolvedValue(true),
    }

    const mockConfig = {
      get: jest.fn().mockReturnValue('localhost'),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: CourseRepository, useValue: mockRepo },
        { provide: CryptoService, useValue: mockCrypto },
        { provide: ConfigService, useValue: mockConfig },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile()

    service = module.get<CourseService>(CourseService)
    repository = module.get(CourseRepository) as jest.Mocked<CourseRepository>
  })

  describe('listCourses — cache', () => {
    it('should return cached result on cache hit', async () => {
      const cached = {
        data: [{ courseId: 'CS101' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      }
      cacheManager.get.mockResolvedValue(cached)

      const result = await service.listCourses({ page: 1, limit: 20 })

      expect(result).toBe(cached)
      expect(repository.findAll).not.toHaveBeenCalled()
    })

    it('should query DB and cache on miss', async () => {
      repository.findAll.mockResolvedValue({ data: [mockCourseEntity], total: 1 })

      const result = await service.listCourses({ page: 1, limit: 20 })

      expect(result.data).toHaveLength(1)
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('node:courses:list'),
        expect.anything(),
        7200000, // CACHE_TTL.COURSES_LIST (2 hours)
      )
    })
  })

  describe('getOutcomes — cache', () => {
    it('should return cached outcomes on hit', async () => {
      const cached = {
        identifier: 'cfdoc-CS101',
        uri: 'https://localhost/courses/CS101/outcomes',
        title: 'CS101 Learning Outcomes',
        courseId: 'CS101',
        lastChangeDateTime: '2025-01-01T00:00:00.000Z',
        CFItems: [],
      }
      cacheManager.get.mockResolvedValue(cached)

      const result = await service.getOutcomes('CS101')

      expect(result).toBe(cached)
      expect(repository.findByCourseId).not.toHaveBeenCalled()
    })

    it('should cache outcomes with 6h TTL', async () => {
      repository.findByCourseId.mockResolvedValue(mockCourseEntity)
      repository.getOutcomesByCourseId.mockResolvedValue([mockOutcome])

      await service.getOutcomes('CS101')

      expect(cacheManager.set).toHaveBeenCalledWith(
        'node:course:outcomes:CS101',
        expect.objectContaining({ identifier: 'cfdoc-CS101' }),
        21600000, // CACHE_TTL.COURSE_OUTCOMES (6 hours)
      )
    })
  })

  describe('getSyllabus — cache', () => {
    it('should return cached syllabus on hit', async () => {
      const cached = [{ courseId: 'CS101', week: 1, topic: 'Intro' }]
      cacheManager.get.mockResolvedValue(cached)

      const result = await service.getSyllabus('CS101')

      expect(result).toBe(cached)
      expect(repository.findByCourseId).not.toHaveBeenCalled()
    })

    it('should cache syllabus with 6h TTL', async () => {
      repository.findByCourseId.mockResolvedValue(mockCourseEntity)
      repository.getSyllabusByCourseId.mockResolvedValue([mockSyllabus])

      await service.getSyllabus('CS101')

      expect(cacheManager.set).toHaveBeenCalledWith(
        'node:course:syllabus:CS101',
        expect.any(Array),
        21600000, // CACHE_TTL.COURSE_SYLLABUS (6 hours)
      )
    })
  })

  describe('searchCourses — cache', () => {
    it('should return cached search results on hit', async () => {
      const cached = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }
      cacheManager.get.mockResolvedValue(cached)

      const result = await service.searchCourses({ q: 'CS', page: 1, limit: 20 })

      expect(result).toBe(cached)
      expect(repository.search).not.toHaveBeenCalled()
    })
  })

  describe('getSchemaOrg — cache', () => {
    it('should cache schema.org with 24h TTL', async () => {
      repository.findByCourseId.mockResolvedValue(mockCourseEntity)

      await service.getSchemaOrg('CS101')

      expect(cacheManager.set).toHaveBeenCalledWith(
        'node:course:schemaorg:CS101',
        expect.objectContaining({ '@type': 'Course' }),
        86400000, // CACHE_TTL.COURSE_SCHEMA_ORG (24 hours)
      )
    })
  })

  describe('invalidateCourseCache', () => {
    it('should reset entire cache', async () => {
      await service.invalidateCourseCache()

      expect(cacheManager.reset).toHaveBeenCalledTimes(1)
    })
  })
})
