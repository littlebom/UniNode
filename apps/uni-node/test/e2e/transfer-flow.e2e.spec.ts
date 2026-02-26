import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { TransferController } from '../../src/transfer/transfer.controller'
import { TransferService } from '../../src/transfer/transfer.service'
import { createTestApp } from '../helpers/test-app'
import { TOKENS } from '../helpers/auth.helper'
import { TEST_TRANSFER_REQUEST, TEST_TRANSFER_RESPONSE } from '../fixtures/test-data'

jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
  verifyVC: jest.fn(),
}))

describe('Transfer Flow E2E', () => {
  let app: INestApplication

  const mockTransferService = {
    createTransferRequest: jest.fn(),
    getTransfer: jest.fn(),
    approveTransfer: jest.fn(),
    rejectTransfer: jest.fn(),
  }

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [TransferController],
      providers: [{ provide: TransferService, useValue: mockTransferService }],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── POST /unilink/api/v1/transfer/request ──

  describe('POST /unilink/api/v1/transfer/request', () => {
    it('should create transfer request (node_admin)', async () => {
      mockTransferService.createTransferRequest.mockResolvedValue(TEST_TRANSFER_RESPONSE)

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/transfer/request')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(TEST_TRANSFER_REQUEST)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.transferId).toBeDefined()
      expect(res.body.data.status).toBe('pending')
    })

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/transfer/request')
        .send(TEST_TRANSFER_REQUEST)
        .expect(401)
    })

    it('should return 403 for student', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/transfer/request')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send(TEST_TRANSFER_REQUEST)
        .expect(403)
    })
  })

  // ── GET /unilink/api/v1/transfer/:transferId ──

  describe('GET /unilink/api/v1/transfer/:transferId', () => {
    it('should return transfer details', async () => {
      mockTransferService.getTransfer.mockResolvedValue(TEST_TRANSFER_RESPONSE)

      const res = await request(app.getHttpServer())
        .get(`/unilink/api/v1/transfer/${TEST_TRANSFER_RESPONSE.transferId}`)
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.transferId).toBe(TEST_TRANSFER_RESPONSE.transferId)
      expect(res.body.data.sourceCourse ?? res.body.data.sourceCourseId).toBe('CS101')
    })
  })

  // ── PUT /unilink/api/v1/transfer/:transferId/approve ──

  describe('PUT /unilink/api/v1/transfer/:transferId/approve', () => {
    it('should approve transfer (node_admin)', async () => {
      const approved = {
        ...TEST_TRANSFER_RESPONSE,
        status: 'approved',
        transferVcId: 'vc-transfer-001',
      }
      mockTransferService.approveTransfer.mockResolvedValue(approved)

      const res = await request(app.getHttpServer())
        .put(`/unilink/api/v1/transfer/${TEST_TRANSFER_RESPONSE.transferId}/approve`)
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ reviewNote: 'ผ่านตามเกณฑ์' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('approved')
    })

    it('should return 403 for student', async () => {
      await request(app.getHttpServer())
        .put(`/unilink/api/v1/transfer/${TEST_TRANSFER_RESPONSE.transferId}/approve`)
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .expect(403)
    })
  })

  // ── PUT /unilink/api/v1/transfer/:transferId/reject ──

  describe('PUT /unilink/api/v1/transfer/:transferId/reject', () => {
    it('should reject transfer (node_admin)', async () => {
      const rejected = { ...TEST_TRANSFER_RESPONSE, status: 'rejected' }
      mockTransferService.rejectTransfer.mockResolvedValue(rejected)

      const res = await request(app.getHttpServer())
        .put(`/unilink/api/v1/transfer/${TEST_TRANSFER_RESPONSE.transferId}/reject`)
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ reviewNote: 'เกรดไม่ผ่านเกณฑ์' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('rejected')
    })
  })
})
