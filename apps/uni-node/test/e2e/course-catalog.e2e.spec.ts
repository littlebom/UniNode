import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { CourseController } from '../../src/course/course.controller'
import { CourseService } from '../../src/course/course.service'
import { createTestApp } from '../helpers/test-app'
import { TOKENS } from '../helpers/auth.helper'
import { TEST_COURSE, TEST_COURSE_LIS, TEST_CASE_DOCUMENT } from '../fixtures/test-data'

jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

describe('Course Catalog E2E', () => {
  let app: INestApplication

  const mockCourseService = {
    listCourses: jest.fn(),
    searchCourses: jest.fn(),
    getCourse: jest.fn(),
    getOutcomes: jest.fn(),
    getSyllabus: jest.fn(),
    getSchemaOrg: jest.fn(),
    calculateLOMatch: jest.fn(),
    verifyCourseIntegrity: jest.fn(),
  }

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [CourseController],
      providers: [{ provide: CourseService, useValue: mockCourseService }],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── GET /unilink/api/v1/courses ──

  describe('GET /unilink/api/v1/courses', () => {
    it('should list courses with pagination', async () => {
      mockCourseService.listCourses.mockResolvedValue({
        data: [TEST_COURSE_LIS],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      })

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/courses')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.data).toHaveLength(1)
      expect(res.body.data.data[0].coursCode || res.body.data.data[0].courseCode).toBeDefined()
    })

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/courses')
        .expect(401)
    })
  })

  // ── GET /unilink/api/v1/courses/search ──

  describe('GET /unilink/api/v1/courses/search', () => {
    it('should search courses by keyword', async () => {
      mockCourseService.searchCourses.mockResolvedValue({
        data: [TEST_COURSE_LIS],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      })

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/courses/search')
        .query({ q: 'Computer Science' })
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
    })
  })

  // ── GET /unilink/api/v1/courses/:courseId ──

  describe('GET /unilink/api/v1/courses/:courseId', () => {
    it('should return course details (LIS v2.0)', async () => {
      mockCourseService.getCourse.mockResolvedValue(TEST_COURSE_LIS)

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/courses/CS101')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.sourcedId || res.body.data.courseId).toBeDefined()
    })
  })

  // ── GET /unilink/api/v1/courses/:courseId/outcomes ──

  describe('GET /unilink/api/v1/courses/:courseId/outcomes', () => {
    it('should return learning outcomes (CASE v1.1)', async () => {
      mockCourseService.getOutcomes.mockResolvedValue(TEST_CASE_DOCUMENT)

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/courses/CS101/outcomes')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.CFDocument).toBeDefined()
      expect(res.body.data.CFItems).toHaveLength(1)
    })
  })

  // ── GET /unilink/api/v1/courses/:courseId/syllabus ──

  describe('GET /unilink/api/v1/courses/:courseId/syllabus', () => {
    it('should return weekly syllabus', async () => {
      const syllabus = {
        courseId: 'CS101',
        weeks: [
          { week: 1, topic: 'Introduction', description: 'Overview of CS' },
        ],
      }
      mockCourseService.getSyllabus.mockResolvedValue(syllabus)

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/courses/CS101/syllabus')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.weeks).toBeDefined()
    })
  })

  // ── GET /unilink/api/v1/courses/:courseId/schema ──

  describe('GET /unilink/api/v1/courses/:courseId/schema', () => {
    it('should return schema.org/Course format', async () => {
      const schemaOrg = {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: 'Introduction to Computer Science',
        courseCode: 'CS101',
        numberOfCredits: 3,
      }
      mockCourseService.getSchemaOrg.mockResolvedValue(schemaOrg)

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/courses/CS101/schema')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data['@type']).toBe('Course')
    })
  })

  // ── GET /unilink/api/v1/courses/:courseId/lo-match ──

  describe('GET /unilink/api/v1/courses/:courseId/lo-match', () => {
    it('should calculate LO match percentage', async () => {
      mockCourseService.calculateLOMatch.mockResolvedValue({
        sourceCourseId: 'CS101',
        targetCourseId: 'CPE101',
        matchPercentage: 85.5,
        matchedOutcomes: 6,
        totalOutcomes: 7,
      })

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/courses/CS101/lo-match')
        .query({ targetCourseId: 'CPE101' })
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.matchPercentage).toBe(85.5)
    })
  })

  // ── POST /unilink/api/v1/courses/verify-integrity ──

  describe('POST /unilink/api/v1/courses/verify-integrity', () => {
    it('should verify course data integrity', async () => {
      mockCourseService.verifyCourseIntegrity.mockResolvedValue({
        isValid: true,
        verifiedAt: '2026-02-25T10:00:00.000Z',
      })

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/courses/verify-integrity')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          courseData: { courseId: 'CS101', courseName: 'Intro to CS', credits: 3 },
          integrity: {
            hash: 'sha256:abc123',
            signature: 'mock-signature',
            signingKey: 'did:web:tu.ac.th#key-1',
          },
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.isValid).toBe(true)
    })
  })
})
