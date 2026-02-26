import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { ExternalController } from '../../src/external/external.controller'
import { ExternalService } from '../../src/external/external.service'
import { createTestApp } from '../helpers/test-app'
import { TOKENS } from '../helpers/auth.helper'
import {
  TEST_EXTERNAL_SUBMIT,
  TEST_EXTERNAL_DETAIL,
  TEST_EXTERNAL_APPROVE,
} from '../fixtures/test-data'

jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

describe('External Credential E2E', () => {
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
      providers: [{ provide: ExternalService, useValue: mockExternalService }],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── GET /unilink/api/v1/external ──

  describe('GET /unilink/api/v1/external', () => {
    it('should list external credential requests', async () => {
      mockExternalService.listRequests.mockResolvedValue({
        data: [TEST_EXTERNAL_DETAIL],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      })

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/external')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.data).toHaveLength(1)
      expect(res.body.data.data[0].platform).toBe('Coursera')
    })

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/external')
        .expect(401)
    })
  })

  // ── GET /unilink/api/v1/external/:requestId ──

  describe('GET /unilink/api/v1/external/:requestId', () => {
    it('should return external credential detail', async () => {
      mockExternalService.getDetail.mockResolvedValue(TEST_EXTERNAL_DETAIL)

      const res = await request(app.getHttpServer())
        .get(`/unilink/api/v1/external/${TEST_EXTERNAL_DETAIL.requestId}`)
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.requestId).toBe(TEST_EXTERNAL_DETAIL.requestId)
      expect(res.body.data.status).toBe('pending')
    })
  })

  // ── POST /unilink/api/v1/external/submit ──

  describe('POST /unilink/api/v1/external/submit', () => {
    it('should submit external credential', async () => {
      mockExternalService.submitRequest.mockResolvedValue({
        ...TEST_EXTERNAL_DETAIL,
        status: 'pending',
      })

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/external/submit')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(TEST_EXTERNAL_SUBMIT)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.platform).toBe('Coursera')
    })
  })

  // ── PUT /unilink/api/v1/external/:requestId/approve ──

  describe('PUT /unilink/api/v1/external/:requestId/approve', () => {
    it('should approve external credential (node_admin)', async () => {
      mockExternalService.approve.mockResolvedValue({
        ...TEST_EXTERNAL_DETAIL,
        status: 'approved',
      })

      const res = await request(app.getHttpServer())
        .put(`/unilink/api/v1/external/${TEST_EXTERNAL_DETAIL.requestId}/approve`)
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(TEST_EXTERNAL_APPROVE)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('approved')
    })

    it('should return 403 for student', async () => {
      await request(app.getHttpServer())
        .put(`/unilink/api/v1/external/${TEST_EXTERNAL_DETAIL.requestId}/approve`)
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send(TEST_EXTERNAL_APPROVE)
        .expect(403)
    })
  })

  // ── PUT /unilink/api/v1/external/:requestId/reject ──

  describe('PUT /unilink/api/v1/external/:requestId/reject', () => {
    it('should reject external credential', async () => {
      mockExternalService.reject.mockResolvedValue({
        ...TEST_EXTERNAL_DETAIL,
        status: 'rejected',
      })

      const res = await request(app.getHttpServer())
        .put(`/unilink/api/v1/external/${TEST_EXTERNAL_DETAIL.requestId}/reject`)
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ note: 'Certificate cannot be verified' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('rejected')
    })
  })
})
