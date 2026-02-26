import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { VCController } from '../../src/vc/vc.controller'
import { VCService } from '../../src/vc/vc.service'
import { createTestApp } from '../helpers/test-app'
import { TOKENS } from '../helpers/auth.helper'
import { TEST_VC_ISSUE, TEST_VC_RESPONSE, TEST_VP, TEST_VP_RESULT } from '../fixtures/test-data'

jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
  verifyVC: jest.fn(),
  createVP: jest.fn(),
  verifyVP: jest.fn(),
}))

describe('VC Flow E2E', () => {
  let app: INestApplication

  const mockVcService = {
    issueVC: jest.fn(),
    getVC: jest.fn(),
    revokeVC: jest.fn(),
    generateChallenge: jest.fn(),
    verifyPresentation: jest.fn(),
  }

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [VCController],
      providers: [{ provide: VCService, useValue: mockVcService }],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── POST /unilink/api/v1/vc/issue ──

  describe('POST /unilink/api/v1/vc/issue', () => {
    it('should issue VC (node_admin)', async () => {
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

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .send(TEST_VC_ISSUE)
        .expect(401)
    })

    it('should return 403 for student role', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send(TEST_VC_ISSUE)
        .expect(403)
    })

    it('should return 401 with expired token', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .set('Authorization', `Bearer ${TOKENS.expired}`)
        .send(TEST_VC_ISSUE)
        .expect(401)
    })
  })

  // ── GET /unilink/api/v1/vc/:vcId ──

  describe('GET /unilink/api/v1/vc/:vcId', () => {
    it('should return VC details', async () => {
      mockVcService.getVC.mockResolvedValue(TEST_VC_RESPONSE)

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/vc/vc-cs101-6401001-2569-1')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.vcId).toBe('vc-cs101-6401001-2569-1')
      expect(res.body.data.vc).toBeDefined()
    })

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/vc/vc-cs101-6401001-2569-1')
        .expect(401)
    })
  })

  // ── DELETE /unilink/api/v1/vc/:vcId/revoke ──

  describe('DELETE /unilink/api/v1/vc/:vcId/revoke', () => {
    it('should revoke VC (node_admin)', async () => {
      mockVcService.revokeVC.mockResolvedValue({
        vcId: 'vc-cs101-6401001-2569-1',
        status: 'revoked',
      })

      const res = await request(app.getHttpServer())
        .delete('/unilink/api/v1/vc/vc-cs101-6401001-2569-1/revoke')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ reason: 'Test revocation' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('revoked')
    })

    it('should return 403 for student', async () => {
      await request(app.getHttpServer())
        .delete('/unilink/api/v1/vc/vc-cs101-6401001-2569-1/revoke')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .expect(403)
    })
  })

  // ── POST /unilink/api/v1/vc/challenge (Public) ──

  describe('POST /unilink/api/v1/vc/challenge', () => {
    it('should generate challenge without auth', async () => {
      mockVcService.generateChallenge.mockReturnValue({
        challenge: 'random-challenge-uuid',
        expiresAt: '2026-02-25T10:05:00.000Z',
      })

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/challenge')
        .send({ domain: 'cu.ac.th' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.challenge).toBeDefined()
      expect(res.body.data.expiresAt).toBeDefined()
    })
  })

  // ── POST /unilink/api/v1/vc/verify (Public) ──

  describe('POST /unilink/api/v1/vc/verify', () => {
    it('should verify valid VP without auth', async () => {
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
      expect(res.body.data.valid ?? res.body.data.isValid).toBe(true)
      expect(res.body.data.holder).toBe('did:web:tu.ac.th:students:6401001')
    })
  })
})
