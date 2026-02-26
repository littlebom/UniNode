import { Test, TestingModule } from '@nestjs/testing'
import { VCController } from '../vc.controller'
import { VCService } from '../vc.service'

// Mock packages to avoid ESM dependency issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
  getDIDDocument: jest.fn(),
  buildStatusListCredential: jest.fn(),
  createStatusList: jest.fn(),
  setRevoked: jest.fn(),
}))

describe('VCController', () => {
  let controller: VCController
  let vcService: jest.Mocked<VCService>

  const mockVcResult = {
    vcId: 'vc-tu-cs101-6501234-2567-1',
    status: 'issued',
    vc: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id: 'vc-tu-cs101-6501234-2567-1',
      type: ['VerifiableCredential', 'CourseCreditCredential'],
      issuer: 'did:web:tu.ac.th',
      issuanceDate: '2026-02-23T10:00:00Z',
      credentialSubject: { id: 'did:web:tu.ac.th:students:6501234' },
      proof: { type: 'Ed25519Signature2020', proofValue: 'mock' },
    },
  }

  beforeEach(async () => {
    const mockVcService = {
      issueVC: jest.fn().mockResolvedValue(mockVcResult),
      getVC: jest.fn().mockResolvedValue({
        vcId: 'vc-tu-cs101-6501234-2567-1',
        status: 'active',
        vc: mockVcResult.vc,
        issuedAt: new Date(),
        revokedAt: null,
      }),
      revokeVC: jest.fn().mockResolvedValue({
        vcId: 'vc-tu-cs101-6501234-2567-1',
        status: 'revoked',
      }),
      generateChallenge: jest.fn().mockReturnValue({
        challenge: 'test-challenge-uuid',
        expiresAt: '2026-02-23T10:05:00Z',
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VCController],
      providers: [
        { provide: VCService, useValue: mockVcService },
      ],
    }).compile()

    controller = module.get<VCController>(VCController)
    vcService = module.get(VCService)
  })

  describe('POST /vc/issue', () => {
    it('should issue a VC and return success response', async () => {
      const result = await controller.issueVC({
        studentId: '6501234',
        courseId: 'CS101',
        grade: 'A',
        gradePoint: 4.0,
        semester: '1',
        academicYear: '2567',
      })

      expect(result.success).toBe(true)
      expect(result.data?.vcId).toBe('vc-tu-cs101-6501234-2567-1')
      expect(result.data?.status).toBe('issued')
      expect(vcService.issueVC).toHaveBeenCalled()
    })
  })

  describe('GET /vc/:vcId', () => {
    it('should return VC details', async () => {
      const result = await controller.getVC('vc-tu-cs101-6501234-2567-1')

      expect(result.success).toBe(true)
      expect(result.data?.vcId).toBe('vc-tu-cs101-6501234-2567-1')
      expect(result.data?.status).toBe('active')
      expect(result.data?.vc).toBeDefined()
    })
  })

  describe('DELETE /vc/:vcId/revoke', () => {
    it('should revoke a VC', async () => {
      const result = await controller.revokeVC(
        'vc-tu-cs101-6501234-2567-1',
        { reason: 'Grade error' },
      )

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('revoked')
      expect(vcService.revokeVC).toHaveBeenCalledWith(
        'vc-tu-cs101-6501234-2567-1',
        'Grade error',
      )
    })
  })

  describe('POST /vc/challenge', () => {
    it('should return a challenge', () => {
      const result = controller.generateChallenge({ domain: 'tu.ac.th' })

      expect(result.success).toBe(true)
      expect(result.data?.challenge).toBe('test-challenge-uuid')
      expect(result.data?.expiresAt).toBeDefined()
    })
  })
})
