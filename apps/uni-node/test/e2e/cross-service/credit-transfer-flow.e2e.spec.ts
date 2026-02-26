import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { VCController } from '../../../src/vc/vc.controller'
import { VCService } from '../../../src/vc/vc.service'
import { TransferController } from '../../../src/transfer/transfer.controller'
import { TransferService } from '../../../src/transfer/transfer.service'
import { createTestApp } from '../../helpers/test-app'
import { TOKENS } from '../../helpers/auth.helper'
import {
  TEST_VC_ISSUE,
  TEST_VC_RESPONSE,
  TEST_TRANSFER_REQUEST,
  TEST_TRANSFER_RESPONSE,
  TEST_VP,
  TEST_VP_RESULT,
} from '../../fixtures/test-data'

jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
  verifyRaw: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
  verifyVC: jest.fn(),
  verifyVP: jest.fn(),
  isRevoked: jest.fn(),
  didWebToUrl: jest.fn(),
}))

describe('Cross-Service: Credit Transfer Flow E2E', () => {
  let app: INestApplication

  const mockVcService = {
    issueVC: jest.fn(),
    getVC: jest.fn(),
    revokeVC: jest.fn(),
    generateChallenge: jest.fn(),
    verifyPresentation: jest.fn(),
  }

  const mockTransferService = {
    createTransferRequest: jest.fn(),
    getTransfer: jest.fn(),
    approveTransfer: jest.fn(),
    rejectTransfer: jest.fn(),
  }

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [VCController, TransferController],
      providers: [
        { provide: VCService, useValue: mockVcService },
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

  // ── Full Credit Transfer Flow ──────────────────────────

  describe('Full Credit Transfer Flow', () => {
    it('Step 1: Issue VC for student course completion', async () => {
      mockVcService.issueVC.mockResolvedValue(TEST_VC_RESPONSE)

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(TEST_VC_ISSUE)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.vcId).toBe('vc-cs101-6401001-2569-1')
      expect(res.body.data.status).toBe('issued')
    })

    it('Step 2: Generate challenge for VP verification', async () => {
      mockVcService.generateChallenge.mockReturnValue({
        challenge: '00000000-0000-4000-8000-000000000001',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/challenge')
        .send({ domain: 'cu.ac.th' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.challenge).toBeDefined()
      expect(res.body.data.expiresAt).toBeDefined()
    })

    it('Step 3: Verify VP with embedded VC', async () => {
      mockVcService.verifyPresentation.mockResolvedValue(TEST_VP_RESULT)

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: TEST_VP,
          challenge: '00000000-0000-4000-8000-000000000001',
          domain: 'cu.ac.th',
        })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.valid).toBe(true)
      expect(res.body.data.holder).toBe('did:web:tu.ac.th:students:6401001')
    })

    it('Step 4: Create transfer request after VP verification', async () => {
      mockTransferService.createTransferRequest.mockResolvedValue(
        TEST_TRANSFER_RESPONSE,
      )

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/transfer/request')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(TEST_TRANSFER_REQUEST)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.transferId).toBe(
        'txfr-tu-ac-th-cu-ac-th-6401001-001',
      )
      expect(res.body.data.status).toBe('pending')
    })

    it('Step 5: Approve the transfer request', async () => {
      const approvedTransfer = {
        ...TEST_TRANSFER_RESPONSE,
        status: 'approved',
        reviewedBy: 'system-admin',
        reviewNote: 'Equivalency verified, transfer approved',
      }
      mockTransferService.approveTransfer.mockResolvedValue(approvedTransfer)

      const res = await request(app.getHttpServer())
        .put(
          '/unilink/api/v1/transfer/txfr-tu-ac-th-cu-ac-th-6401001-001/approve',
        )
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ reviewNote: 'Equivalency verified, transfer approved' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('approved')
    })
  })

  // ── Error Scenarios ────────────────────────────────────

  describe('Error Scenarios', () => {
    it('should fail transfer when VC is revoked', async () => {
      const { UniLinkException, UniLinkErrorCode } = jest.requireActual(
        '@unilink/dto',
      ) as typeof import('@unilink/dto')

      mockTransferService.createTransferRequest.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.VC_REVOKED,
          400,
          'Source VC has been revoked',
          'VC ต้นทางถูกเพิกถอนแล้ว',
        ),
      )

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/transfer/request')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(TEST_TRANSFER_REQUEST)
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('VC_REVOKED')
    })

    it('should fail transfer when grade is below minimum', async () => {
      const { UniLinkException, UniLinkErrorCode } = jest.requireActual(
        '@unilink/dto',
      ) as typeof import('@unilink/dto')

      mockTransferService.createTransferRequest.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.TRANSFER_GRADE_TOO_LOW,
          400,
          'Grade point 1.5 is below minimum 2.5 (C+)',
          'เกรดเฉลี่ย 1.5 ต่ำกว่าเกณฑ์ขั้นต่ำ 2.5 (C+)',
        ),
      )

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/transfer/request')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(TEST_TRANSFER_REQUEST)
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('TRANSFER_GRADE_TOO_LOW')
    })

    it('should fail VP verification when challenge expired', async () => {
      const { UniLinkException, UniLinkErrorCode } = jest.requireActual(
        '@unilink/dto',
      ) as typeof import('@unilink/dto')

      mockVcService.verifyPresentation.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.VP_CHALLENGE_EXPIRED,
          400,
          'Challenge is invalid, expired, or already used',
          'Challenge ไม่ถูกต้อง หมดอายุ หรือถูกใช้ไปแล้ว',
        ),
      )

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: TEST_VP,
          challenge: '00000000-0000-4000-8000-000000000099',
          domain: 'cu.ac.th',
        })
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('VP_CHALLENGE_EXPIRED')
    })

    it('should fail transfer when VC not found', async () => {
      const { UniLinkException, UniLinkErrorCode } = jest.requireActual(
        '@unilink/dto',
      ) as typeof import('@unilink/dto')

      mockTransferService.createTransferRequest.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.VC_NOT_FOUND,
          404,
          'Source VC vc-nonexistent not found',
          'ไม่พบ VC ต้นทาง vc-nonexistent',
        ),
      )

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/transfer/request')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ ...TEST_TRANSFER_REQUEST, sourceVcId: 'vc-nonexistent' })
        .expect(404)

      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('VC_NOT_FOUND')
    })

    it('should reject transfer when already processed', async () => {
      const { UniLinkException, UniLinkErrorCode } = jest.requireActual(
        '@unilink/dto',
      ) as typeof import('@unilink/dto')

      mockTransferService.approveTransfer.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.TRANSFER_ALREADY_PROCESSED,
          409,
          'Transfer has already been processed',
          'การโอนหน่วยกิตนี้ถูกดำเนินการไปแล้ว',
        ),
      )

      const res = await request(app.getHttpServer())
        .put(
          '/unilink/api/v1/transfer/txfr-tu-ac-th-cu-ac-th-6401001-001/approve',
        )
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ reviewNote: 'Approve again' })
        .expect(409)

      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('TRANSFER_ALREADY_PROCESSED')
    })
  })

  // ── Authorization in Transfer Flow ─────────────────────

  describe('Authorization in Transfer Flow', () => {
    it('student should not be able to issue VC', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send(TEST_VC_ISSUE)
        .expect(403)
    })

    it('student should not be able to create transfer request', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/transfer/request')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send(TEST_TRANSFER_REQUEST)
        .expect(403)
    })

    it('student should not be able to approve transfer', async () => {
      await request(app.getHttpServer())
        .put(
          '/unilink/api/v1/transfer/txfr-tu-ac-th-cu-ac-th-6401001-001/approve',
        )
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send({ reviewNote: 'Approved' })
        .expect(403)
    })

    it('unauthenticated user CAN request challenge (public)', async () => {
      mockVcService.generateChallenge.mockReturnValue({
        challenge: 'test-challenge',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })

      await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/challenge')
        .send({ domain: 'verifier.ac.th' })
        .expect(200)
    })

    it('unauthenticated user CAN verify VP (public)', async () => {
      mockVcService.verifyPresentation.mockResolvedValue(TEST_VP_RESULT)

      await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: TEST_VP,
          challenge: '00000000-0000-4000-8000-000000000002',
          domain: 'verifier.ac.th',
        })
        .expect(200)
    })
  })

  // ── Rejection Flow ─────────────────────────────────────

  describe('Transfer Rejection Flow', () => {
    it('should reject a transfer request', async () => {
      const rejectedTransfer = {
        ...TEST_TRANSFER_RESPONSE,
        status: 'rejected',
        reviewedBy: 'system-admin',
        reviewNote: 'Course equivalency not established',
      }
      mockTransferService.rejectTransfer.mockResolvedValue(rejectedTransfer)

      const res = await request(app.getHttpServer())
        .put(
          '/unilink/api/v1/transfer/txfr-tu-ac-th-cu-ac-th-6401001-001/reject',
        )
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ reviewNote: 'Course equivalency not established' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('rejected')
    })
  })

  // ── Revocation Impact ──────────────────────────────────

  describe('Revocation Impact on Transfer', () => {
    it('should revoke VC after transfer is pending', async () => {
      mockVcService.revokeVC.mockResolvedValue({
        vcId: 'vc-cs101-6401001-2569-1',
        status: 'revoked',
      })

      const res = await request(app.getHttpServer())
        .delete('/unilink/api/v1/vc/vc-cs101-6401001-2569-1/revoke')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ reason: 'Grade correction needed' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('revoked')
    })

    it('should verify VC status is revoked', async () => {
      const revokedVc = {
        ...TEST_VC_RESPONSE,
        status: 'revoked',
        revokedAt: new Date().toISOString(),
      }
      mockVcService.getVC.mockResolvedValue(revokedVc)

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/vc/vc-cs101-6401001-2569-1')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('revoked')
      expect(res.body.data.revokedAt).toBeDefined()
    })
  })
})
