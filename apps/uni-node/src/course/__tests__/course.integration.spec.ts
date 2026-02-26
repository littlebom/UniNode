import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { CourseController } from '../course.controller'
import { CourseService } from '../course.service'
import { createTestApp } from '../../../test/helpers/test-app'
import { TOKENS } from '../../../test/helpers/auth.helper'
import {
  TEST_COURSE_LIS,
  TEST_CASE_DOCUMENT,
} from '../../../test/fixtures/test-data'

// Mock packages to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

describe('Course Integration Tests', () => {
  let app: INestApplication

  const mockCourseService = {
    listCourses: jest.fn(),
    getCourse: jest.fn(),
    getOutcomes: jest.fn(),
    getSyllabus: jest.fn(),
    getSchemaOrg: jest.fn(),
    searchCourses: jest.fn(),
    verifyCourseIntegrity: jest.fn(),
    calculateLOMatch: jest.fn(),
  }

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [CourseController],
      providers: [
        { provide: CourseService, useValue: mockCourseService },
      ],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─── GET /courses ─────────────────────────────────────

  describe('GET /unilink/api/v1/courses', () => {
    it('should return paginated course list', async () => {
      mockCourseService.listCourses.mockResolvedValue({
        data: [TEST_COURSE_LIS],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      })

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/courses')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.data).toHaveLength(1)
      expect(res.body.data.data[0].courseCode).toBe('CS101')
      expect(res.body.data.meta.total).toBe(1)
    })

    it('should pass search query params to service', async () => {
      mockCourseService.listCourses.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      })

      await request(app.getHttpServer())
        .get('/unilink/api/v1/courses?faculty=Engineering&page=1&limit=10')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(mockCourseService.listCourses).toHaveBeenCalledWith(
        expect.objectContaining({
          faculty: 'Engineering',
          page: 1,
          limit: 10,
        }),
      )
    })
  })

  // ─── GET /courses/:courseId ───────────────────────────

  describe('GET /unilink/api/v1/courses/:courseId', () => {
    it('should return course detail with 200', async () => {
      mockCourseService.getCourse.mockResolvedValue(TEST_COURSE_LIS)

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/courses/CS101')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.courseCode).toBe('CS101')
      expect(res.body.data.title).toBe('Introduction to Computer Science')
    })

    it('should return error when course not found', async () => {
      mockCourseService.getCourse.mockRejectedValue(
        new Error('Course CS999 not found'),
      )

      await request(app.getHttpServer())
        .get('/unilink/api/v1/courses/CS999')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)
    })
  })

  // ─── GET /courses/:courseId/outcomes ───────────────────

  describe('GET /unilink/api/v1/courses/:courseId/outcomes', () => {
    it('should return CASE v1.1 format outcomes', async () => {
      mockCourseService.getOutcomes.mockResolvedValue(TEST_CASE_DOCUMENT)

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/courses/CS101/outcomes')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.CFDocument).toBeDefined()
      expect(res.body.data.CFItems).toBeDefined()
      expect(res.body.data.CFItems).toHaveLength(1)
    })

    it('should return error when no outcomes exist', async () => {
      mockCourseService.getOutcomes.mockRejectedValue(
        new Error('No learning outcomes found for course CS999'),
      )

      await request(app.getHttpServer())
        .get('/unilink/api/v1/courses/CS999/outcomes')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)
    })
  })

  // ─── GET /courses/search ──────────────────────────────

  describe('GET /unilink/api/v1/courses/search', () => {
    it('should search courses by keyword', async () => {
      mockCourseService.searchCourses.mockResolvedValue({
        data: [TEST_COURSE_LIS],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      })

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/courses/search?q=Computer')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.data).toHaveLength(1)
    })
  })
})
