import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { TransferController } from '../transfer.controller'
import { TransferService } from '../transfer.service'
import { createTestApp } from '../../../test/helpers/test-app'
import { TOKENS } from '../../../test/helpers/auth.helper'
import {
  TEST_TRANSFER_REQUEST,
  TEST_TRANSFER_RESPONSE,
} from '../../../test/fixtures/test-data'

// Mock packages to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

describe('Transfer Integration Tests', () => {
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
      providers: [
        { provide: TransferService, useValue: mockTransferService },
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

  // ─── POST /transfer/request ───────────────────────────

  describe('POST /unilink/api/v1/transfer/request', () => {
    it('should create transfer request and return 201', async () => {
      mockTransferService.createTransferRequest.mockResolvedValue(
        TEST_TRANSFER_RESPONSE,
      )

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/transfer/request')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(TEST_TRANSFER_REQUEST)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.transferId).toBe(TEST_TRANSFER_RESPONSE.transferId)
      expect(res.body.data.status).toBe('pending')
      expect(res.body.timestamp).toBeDefined()
    })

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/transfer/request')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ studentId: '6401001' })
        .expect(400)

      expect(res.body.success).toBe(false)
    })

    it('should return 403 for non-admin roles', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/transfer/request')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send(TEST_TRANSFER_REQUEST)
        .expect(403)
    })
  })

  // ─── GET /transfer/:transferId ────────────────────────

  describe('GET /unilink/api/v1/transfer/:transferId', () => {
    it('should return transfer details with 200', async () => {
      mockTransferService.getTransfer.mockResolvedValue(TEST_TRANSFER_RESPONSE)

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/transfer/txfr-tu-ac-th-cu-ac-th-6401001-001')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.transferId).toBe(TEST_TRANSFER_RESPONSE.transferId)
    })

    it('should return error when transfer not found', async () => {
      mockTransferService.getTransfer.mockRejectedValue(
        new Error('Transfer not found'),
      )

      await request(app.getHttpServer())
        .get('/unilink/api/v1/transfer/txfr-nonexistent')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)
    })
  })

  // ─── PUT /transfer/:transferId/approve ────────────────

  describe('PUT /unilink/api/v1/transfer/:transferId/approve', () => {
    it('should approve transfer and return 200', async () => {
      const approvedResponse = {
        ...TEST_TRANSFER_RESPONSE,
        status: 'approved',
        reviewedBy: 'system-admin',
      }
      mockTransferService.approveTransfer.mockResolvedValue(approvedResponse)

      const res = await request(app.getHttpServer())
        .put('/unilink/api/v1/transfer/txfr-tu-ac-th-cu-ac-th-6401001-001/approve')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ reviewNote: 'Approved per equivalency mapping' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('approved')
    })

    it('should propagate already-processed errors', async () => {
      mockTransferService.approveTransfer.mockRejectedValue(
        new Error('Transfer has already been processed'),
      )

      await request(app.getHttpServer())
        .put('/unilink/api/v1/transfer/txfr-tu-ac-th-cu-ac-th-6401001-001/approve')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({})
        .expect(500)
    })
  })

  // ─── PUT /transfer/:transferId/reject ─────────────────

  describe('PUT /unilink/api/v1/transfer/:transferId/reject', () => {
    it('should reject transfer and return 200', async () => {
      const rejectedResponse = {
        ...TEST_TRANSFER_RESPONSE,
        status: 'rejected',
        reviewNote: 'Courses not equivalent',
      }
      mockTransferService.rejectTransfer.mockResolvedValue(rejectedResponse)

      const res = await request(app.getHttpServer())
        .put('/unilink/api/v1/transfer/txfr-tu-ac-th-cu-ac-th-6401001-001/reject')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ reviewNote: 'Courses not equivalent' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('rejected')
    })

    it('should return error when transfer not found', async () => {
      mockTransferService.rejectTransfer.mockRejectedValue(
        new Error('Transfer not found'),
      )

      await request(app.getHttpServer())
        .put('/unilink/api/v1/transfer/txfr-nonexistent/reject')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({})
        .expect(500)
    })
  })
})
