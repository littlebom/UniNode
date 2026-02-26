import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { ExternalController } from '../external.controller'
import { ExternalService } from '../external.service'
import { createTestApp } from '../../../test/helpers/test-app'
import { TOKENS } from '../../../test/helpers/auth.helper'
import {
  TEST_EXTERNAL_SUBMIT,
  TEST_EXTERNAL_DETAIL,
  TEST_EXTERNAL_APPROVE,
} from '../../../test/fixtures/test-data'

// Mock packages to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

describe('External Credential Integration Tests', () => {
  let app: INestApplication

  const mockExternalService = {
    listRequests: jest.fn(),
    getDetail: jest.fn(),
    submitRequest: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  }

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ExternalController],
      providers: [
        { provide: ExternalService, useValue: mockExternalService },
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

  // ─── GET /external ────────────────────────────────────

  describe('GET /unilink/api/v1/external', () => {
    it('should return paginated list with 200', async () => {
      mockExternalService.listRequests.mockResolvedValue({
        data: [TEST_EXTERNAL_DETAIL],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      })

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/external')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.data).toHaveLength(1)
      expect(res.body.data.meta.total).toBe(1)
      expect(res.body.data.meta.page).toBe(1)
    })

    it('should pass status filter to service', async () => {
      mockExternalService.listRequests.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      })

      await request(app.getHttpServer())
        .get('/unilink/api/v1/external?status=pending&page=1&limit=10')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(mockExternalService.listRequests).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          page: 1,
          limit: 10,
        }),
      )
    })
  })

  // ─── POST /external/submit ────────────────────────────

  describe('POST /unilink/api/v1/external/submit', () => {
    it('should submit request and return 201', async () => {
      mockExternalService.submitRequest.mockResolvedValue(TEST_EXTERNAL_DETAIL)

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/external/submit')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(TEST_EXTERNAL_SUBMIT)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.requestId).toBe(TEST_EXTERNAL_DETAIL.requestId)
      expect(res.body.data.platform).toBe('Coursera')
      expect(res.body.data.status).toBe('pending')
    })

    it('should return 400 when required fields missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/external/submit')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ studentId: '6401001' })
        .expect(400)

      expect(res.body.success).toBe(false)
    })

    it('should propagate unsupported platform error', async () => {
      mockExternalService.submitRequest.mockRejectedValue(
        new Error('Platform "UnknownPlatform" is not supported'),
      )

      await request(app.getHttpServer())
        .post('/unilink/api/v1/external/submit')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          ...TEST_EXTERNAL_SUBMIT,
          platform: 'UnknownPlatform',
        })
        .expect(500)
    })
  })

  // ─── PUT /external/:requestId/approve ─────────────────

  describe('PUT /unilink/api/v1/external/:requestId/approve', () => {
    it('should approve and return 200 for admin', async () => {
      const approvedDetail = {
        ...TEST_EXTERNAL_DETAIL,
        status: 'approved',
        recognizedCourseId: 'CS101',
        recognizedCredits: 3,
        decidedAt: '2026-02-23T10:00:00.000Z',
      }
      mockExternalService.approve.mockResolvedValue(approvedDetail)

      const res = await request(app.getHttpServer())
        .put('/unilink/api/v1/external/ext-tu-ac-th-6401001-1708000000000/approve')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(TEST_EXTERNAL_APPROVE)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('approved')
      expect(res.body.data.recognizedCourseId).toBe('CS101')
      expect(res.body.data.recognizedCredits).toBe(3)
    })

    it('should allow registrar role to approve', async () => {
      mockExternalService.approve.mockResolvedValue({
        ...TEST_EXTERNAL_DETAIL,
        status: 'approved',
      })

      const res = await request(app.getHttpServer())
        .put('/unilink/api/v1/external/ext-tu-ac-th-6401001-1708000000000/approve')
        .set('Authorization', `Bearer ${TOKENS.registrar}`)
        .send(TEST_EXTERNAL_APPROVE)
        .expect(200)

      expect(res.body.success).toBe(true)
    })

    it('should return 403 for student role', async () => {
      await request(app.getHttpServer())
        .put('/unilink/api/v1/external/ext-test/approve')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send(TEST_EXTERNAL_APPROVE)
        .expect(403)
    })

    it('should propagate credit limit exceeded error', async () => {
      mockExternalService.approve.mockRejectedValue(
        new Error('Credit annual limit exceeded'),
      )

      await request(app.getHttpServer())
        .put('/unilink/api/v1/external/ext-test/approve')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(TEST_EXTERNAL_APPROVE)
        .expect(500)
    })
  })

  // ─── PUT /external/:requestId/reject ──────────────────

  describe('PUT /unilink/api/v1/external/:requestId/reject', () => {
    it('should reject and return 200', async () => {
      const rejectedDetail = {
        ...TEST_EXTERNAL_DETAIL,
        status: 'rejected',
        reviewNote: 'Score too low',
        decidedAt: '2026-02-23T10:00:00.000Z',
      }
      mockExternalService.reject.mockResolvedValue(rejectedDetail)

      const res = await request(app.getHttpServer())
        .put('/unilink/api/v1/external/ext-tu-ac-th-6401001-1708000000000/reject')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ note: 'Score too low' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('rejected')
    })

    it('should propagate already-processed error', async () => {
      mockExternalService.reject.mockRejectedValue(
        new Error('Request has already been processed'),
      )

      await request(app.getHttpServer())
        .put('/unilink/api/v1/external/ext-test/reject')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({})
        .expect(500)
    })
  })
})
