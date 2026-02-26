import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { VCController } from '../vc.controller'
import { VCService } from '../vc.service'
import { createTestApp } from '../../../test/helpers/test-app'
import { TOKENS } from '../../../test/helpers/auth.helper'
import {
  TEST_VC_ISSUE,
  TEST_VC_RESPONSE,
  TEST_VP,
  TEST_VP_RESULT,
} from '../../../test/fixtures/test-data'

// Mock packages to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
  getDIDDocument: jest.fn(),
}))

describe('VC Integration Tests', () => {
  let app: INestApplication

  const mockVCService = {
    issueVC: jest.fn(),
    getVC: jest.fn(),
    revokeVC: jest.fn(),
    generateChallenge: jest.fn(),
    verifyPresentation: jest.fn(),
  }

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [VCController],
      providers: [{ provide: VCService, useValue: mockVCService }],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─── POST /vc/issue ───────────────────────────────────

  describe('POST /unilink/api/v1/vc/issue', () => {
    it('should issue VC and return 201 for node_admin', async () => {
      mockVCService.issueVC.mockResolvedValue({
        vcId: TEST_VC_RESPONSE.vcId,
        status: TEST_VC_RESPONSE.status,
      })

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(TEST_VC_ISSUE)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.vcId).toBe(TEST_VC_RESPONSE.vcId)
      expect(res.body.data.status).toBe('issued')
      expect(res.body.timestamp).toBeDefined()
    })

    it('should return 401 when no token provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .send(TEST_VC_ISSUE)
        .expect(401)

      expect(res.body.success).toBe(false)
    })

    it('should return 403 when role is not node_admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send(TEST_VC_ISSUE)
        .expect(403)

      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBeDefined()
    })

    it('should return 400 when required fields missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ studentId: '6401001' })
        .expect(400)

      expect(res.body.success).toBe(false)
    })
  })

  // ─── GET /vc/:vcId ───────────────────────────────────

  describe('GET /unilink/api/v1/vc/:vcId', () => {
    it('should return VC details for authenticated user', async () => {
      mockVCService.getVC.mockResolvedValue(TEST_VC_RESPONSE)

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/vc/vc-cs101-6401001-2569-1')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.vcId).toBe(TEST_VC_RESPONSE.vcId)
    })

    it('should return 404 when VC not found', async () => {
      mockVCService.getVC.mockRejectedValue(
        new Error('VC not found'),
      )

      await request(app.getHttpServer())
        .get('/unilink/api/v1/vc/vc-nonexistent')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)
    })
  })

  // ─── DELETE /vc/:vcId/revoke ──────────────────────────

  describe('DELETE /unilink/api/v1/vc/:vcId/revoke', () => {
    it('should revoke VC for node_admin', async () => {
      mockVCService.revokeVC.mockResolvedValue({
        vcId: TEST_VC_RESPONSE.vcId,
        status: 'revoked',
      })

      const res = await request(app.getHttpServer())
        .delete('/unilink/api/v1/vc/vc-cs101-6401001-2569-1/revoke')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ reason: 'Grade correction' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('revoked')
    })

    it('should return 403 for non-admin roles', async () => {
      await request(app.getHttpServer())
        .delete('/unilink/api/v1/vc/vc-cs101-6401001-2569-1/revoke')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send({ reason: 'Test' })
        .expect(403)
    })
  })

  // ─── POST /vc/challenge (Public) ──────────────────────

  describe('POST /unilink/api/v1/vc/challenge', () => {
    it('should generate challenge without authentication', async () => {
      mockVCService.generateChallenge.mockReturnValue({
        challenge: '00000000-0000-4000-8000-000000000001',
        expiresAt: '2026-02-23T01:00:00.000Z',
      })

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/challenge')
        .send({ domain: 'tu.ac.th' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.challenge).toBeDefined()
      expect(res.body.data.expiresAt).toBeDefined()
    })
  })

  // ─── POST /vc/verify (Public) ─────────────────────────

  describe('POST /unilink/api/v1/vc/verify', () => {
    it('should verify valid VP without authentication', async () => {
      mockVCService.verifyPresentation.mockResolvedValue(TEST_VP_RESULT)

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: TEST_VP,
          challenge: '00000000-0000-4000-8000-000000000001',
          domain: 'tu.ac.th',
        })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.valid).toBe(true)
    })

    it('should return 400 when VP is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          challenge: '00000000-0000-4000-8000-000000000001',
          domain: 'tu.ac.th',
        })
        .expect(400)

      expect(res.body.success).toBe(false)
    })
  })

  // ─── Auth Enforcement ─────────────────────────────────

  describe('Auth enforcement', () => {
    it('should return 401 for expired JWT', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/vc/vc-test')
        .set('Authorization', `Bearer ${TOKENS.expired}`)
        .expect(401)
    })

    it('should return 401 for invalid JWT signature', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/vc/vc-test')
        .set('Authorization', `Bearer ${TOKENS.invalid}`)
        .expect(401)
    })
  })
})
