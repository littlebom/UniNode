import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { VCController } from '../../src/vc/vc.controller'
import { VCService } from '../../src/vc/vc.service'
import { createTestApp } from '../helpers/test-app'
import { TOKENS } from '../helpers/auth.helper'
import { UniLinkException, UniLinkErrorCode } from '@unilink/dto'
import { TEST_VP, TEST_VP_RESULT, TEST_VC_RESPONSE } from '../fixtures/test-data'

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

describe('VC Signature Security Tests', () => {
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

  // ─── Valid VP Verification ────────────────────────────

  describe('Valid VP Verification', () => {
    it('should successfully verify a valid VP', async () => {
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

    it('should return credentials array in VP result', async () => {
      const resultWithCreds = {
        ...TEST_VP_RESULT,
        credentials: [
          {
            vcId: 'vc-cs101-6401001-2569-1',
            type: ['VerifiableCredential', 'AcademicCredential'],
            isValid: true,
            isRevoked: false,
          },
        ],
      }
      mockVcService.verifyPresentation.mockResolvedValue(resultWithCreds)

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: TEST_VP,
          challenge: '00000000-0000-4000-8000-000000000001',
          domain: 'cu.ac.th',
        })
        .expect(200)

      expect(res.body.data.credentials).toHaveLength(1)
      expect(res.body.data.credentials[0].isValid).toBe(true)
    })
  })

  // ─── Tampered VC Data ─────────────────────────────────

  describe('Tampered VC Data', () => {
    it('should reject VP with tampered VC data (SIGNATURE_INVALID)', async () => {
      mockVcService.verifyPresentation.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.VC_SIGNATURE_INVALID,
          400,
          'VC signature verification failed: data has been tampered',
          'การตรวจสอบลายเซ็น VC ล้มเหลว: ข้อมูลถูกแก้ไข',
        ),
      )

      const tamperedVP = {
        ...TEST_VP,
        verifiableCredential: [
          {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiableCredential', 'AcademicCredential'],
            issuer: 'did:web:tu.ac.th',
            credentialSubject: {
              grade: 'A+', // Tampered: changed from B to A+
            },
            proof: {
              type: 'Ed25519Signature2020',
              proofValue: 'original-signature-not-matching-tampered-data',
            },
          },
        ],
      }

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: tamperedVP,
          challenge: '00000000-0000-4000-8000-000000000001',
          domain: 'cu.ac.th',
        })
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('VC_SIGNATURE_INVALID')
    })

    it('should reject VP with tampered issuer field', async () => {
      mockVcService.verifyPresentation.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.VC_SIGNATURE_INVALID,
          400,
          'VC signature verification failed: issuer mismatch',
          'การตรวจสอบลายเซ็น VC ล้มเหลว: ผู้ออกไม่ตรงกัน',
        ),
      )

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: {
            ...TEST_VP,
            verifiableCredential: [
              {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                issuer: 'did:web:fake-university.com', // Tampered issuer
                proof: { type: 'Ed25519Signature2020', proofValue: 'fake' },
              },
            ],
          },
          challenge: '00000000-0000-4000-8000-000000000001',
          domain: 'cu.ac.th',
        })
        .expect(400)

      expect(res.body.error.code).toBe('VC_SIGNATURE_INVALID')
    })
  })

  // ─── Wrong Signing Key ────────────────────────────────

  describe('Wrong Signing Key', () => {
    it('should reject VP signed with wrong key (SIGNATURE_INVALID)', async () => {
      mockVcService.verifyPresentation.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.VP_SIGNATURE_INVALID,
          400,
          'VP signature verification failed: wrong signing key',
          'การตรวจสอบลายเซ็น VP ล้มเหลว: ใช้ key ผิด',
        ),
      )

      const vpWithWrongKey = {
        ...TEST_VP,
        proof: {
          ...TEST_VP.proof,
          verificationMethod: 'did:web:attacker.com#key-1',
          proofValue: 'signature-from-wrong-key',
        },
      }

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: vpWithWrongKey,
          challenge: '00000000-0000-4000-8000-000000000001',
          domain: 'cu.ac.th',
        })
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('VP_SIGNATURE_INVALID')
    })

    it('should reject VC from unknown issuer', async () => {
      mockVcService.verifyPresentation.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.VC_ISSUER_UNKNOWN,
          502,
          'Failed to fetch DID document from unknown issuer',
          'ไม่สามารถดึง DID document จากผู้ออกที่ไม่รู้จัก',
        ),
      )

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: TEST_VP,
          challenge: '00000000-0000-4000-8000-000000000001',
          domain: 'cu.ac.th',
        })
        .expect(502)

      expect(res.body.error.code).toBe('VC_ISSUER_UNKNOWN')
    })
  })

  // ─── Expired VC ───────────────────────────────────────

  describe('Expired VC', () => {
    it('should reject VP containing expired VC', async () => {
      mockVcService.verifyPresentation.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.VC_EXPIRED,
          400,
          'Verifiable Credential has expired',
          'Verifiable Credential หมดอายุแล้ว',
        ),
      )

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: TEST_VP,
          challenge: '00000000-0000-4000-8000-000000000001',
          domain: 'cu.ac.th',
        })
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('VC_EXPIRED')
    })
  })

  // ─── Revoked VC ───────────────────────────────────────

  describe('Revoked VC', () => {
    it('should reject VP containing revoked VC', async () => {
      mockVcService.verifyPresentation.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.VC_REVOKED,
          400,
          'Verifiable Credential has been revoked',
          'Verifiable Credential ถูกเพิกถอนแล้ว',
        ),
      )

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: TEST_VP,
          challenge: '00000000-0000-4000-8000-000000000001',
          domain: 'cu.ac.th',
        })
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('VC_REVOKED')
    })
  })

  // ─── Challenge Security ───────────────────────────────

  describe('Challenge Security', () => {
    it('should reject VP with expired challenge', async () => {
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

      expect(res.body.error.code).toBe('VP_CHALLENGE_EXPIRED')
    })

    it('should reject VP with mismatched domain', async () => {
      mockVcService.verifyPresentation.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.VP_DOMAIN_MISMATCH,
          400,
          'VP domain does not match the expected domain',
          'โดเมนของ VP ไม่ตรงกับที่คาดหวัง',
        ),
      )

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: TEST_VP,
          challenge: '00000000-0000-4000-8000-000000000001',
          domain: 'attacker.com',
        })
        .expect(400)

      expect(res.body.error.code).toBe('VP_DOMAIN_MISMATCH')
    })

    it('should reject VP with holder mismatch', async () => {
      mockVcService.verifyPresentation.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.VP_HOLDER_MISMATCH,
          400,
          'VP holder does not match credential subject',
          'ผู้ถือ VP ไม่ตรงกับ credential subject',
        ),
      )

      const vpWrongHolder = {
        ...TEST_VP,
        holder: 'did:web:tu.ac.th:students:9999999',
      }

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: vpWrongHolder,
          challenge: '00000000-0000-4000-8000-000000000001',
          domain: 'cu.ac.th',
        })
        .expect(400)

      expect(res.body.error.code).toBe('VP_HOLDER_MISMATCH')
    })

    it('should reject empty VP (no credentials)', async () => {
      mockVcService.verifyPresentation.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.VP_EMPTY,
          400,
          'Verifiable Presentation contains no credentials',
          'Verifiable Presentation ไม่มี credential',
        ),
      )

      const emptyVP = {
        ...TEST_VP,
        verifiableCredential: [],
      }

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: emptyVP,
          challenge: '00000000-0000-4000-8000-000000000001',
          domain: 'cu.ac.th',
        })
        .expect(400)

      expect(res.body.error.code).toBe('VP_EMPTY')
    })
  })

  // ─── VC Issuance Security ─────────────────────────────

  describe('VC Issuance Security', () => {
    it('only admin can issue VC', async () => {
      mockVcService.issueVC.mockResolvedValue(TEST_VC_RESPONSE)

      // Admin can issue
      await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          studentId: '6401001',
          courseId: 'CS101',
          grade: 'A',
          gradePoint: 4,
          semester: '1',
          academicYear: '2569',
          deliveryMode: 'Onsite',
        })
        .expect(201)

      // Student cannot issue
      await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send({
          studentId: '6401001',
          courseId: 'CS101',
          grade: 'A',
          gradePoint: 4,
          semester: '1',
          academicYear: '2569',
          deliveryMode: 'Onsite',
        })
        .expect(403)
    })

    it('only admin can revoke VC', async () => {
      mockVcService.revokeVC.mockResolvedValue({
        vcId: 'vc-cs101-6401001-2569-1',
        status: 'revoked',
      })

      // Admin can revoke
      await request(app.getHttpServer())
        .delete('/unilink/api/v1/vc/vc-cs101-6401001-2569-1/revoke')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ reason: 'Grade correction' })
        .expect(200)

      // Student cannot revoke
      await request(app.getHttpServer())
        .delete('/unilink/api/v1/vc/vc-cs101-6401001-2569-1/revoke')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send({ reason: 'I want to remove my bad grade' })
        .expect(403)
    })

    it('unauthenticated user cannot issue VC', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .send({
          studentId: '6401001',
          courseId: 'CS101',
          grade: 'A',
          gradePoint: 4,
          semester: '1',
          academicYear: '2569',
          deliveryMode: 'Onsite',
        })
        .expect(401)
    })
  })

  // ─── Issuer Suspended ─────────────────────────────────

  describe('Issuer Suspended', () => {
    it('should reject VC from suspended issuer', async () => {
      mockVcService.verifyPresentation.mockRejectedValue(
        new UniLinkException(
          UniLinkErrorCode.VC_ISSUER_SUSPENDED,
          400,
          'VC issuer node has been suspended',
          'Node ผู้ออก VC ถูกระงับ',
        ),
      )

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .send({
          vp: TEST_VP,
          challenge: '00000000-0000-4000-8000-000000000001',
          domain: 'cu.ac.th',
        })
        .expect(400)

      expect(res.body.error.code).toBe('VC_ISSUER_SUSPENDED')
    })
  })
})
