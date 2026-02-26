import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { SisService } from '../sis.service'
import { VCService } from '../../vc/vc.service'
import { VCRepository } from '../../vc/vc.repository'
import { StudentService } from '../../student/student.service'
import { UniLinkException, UniLinkErrorCode } from '@unilink/dto'
import type { VerifiableCredential } from '@unilink/dto'
import { SisWebhookDto } from '../dto/sis-webhook.dto'

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

describe('SisService', () => {
  let service: SisService
  let vcService: jest.Mocked<VCService>
  let vcRepo: jest.Mocked<VCRepository>
  let studentService: jest.Mocked<StudentService>

  const mockConfig = {
    get: jest.fn((_key: string, defaultValue?: string) => {
      const values: Record<string, string> = {
        NODE_DOMAIN: 'tu.ac.th',
        NODE_ID: 'tu.ac.th',
      }
      return values[_key] ?? defaultValue
    }),
  }

  const baseWebhookDto: SisWebhookDto = {
    event: 'grade.recorded',
    studentId: '6501234',
    courseId: 'CS101',
    grade: 'A',
    semester: '1',
    academicYear: '2567',
    recordedAt: '2026-02-23T10:00:00Z',
  }

  const mockVc: VerifiableCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'vc-tu-ac-th-cs101-6501234-2567-1',
    type: ['VerifiableCredential', 'CourseCreditCredential'],
    issuer: 'did:web:tu.ac.th',
    issuanceDate: '2026-02-23T10:00:00Z',
    credentialSubject: { id: 'did:web:tu.ac.th:students:6501234' },
    proof: {
      type: 'Ed25519Signature2020',
      created: '2026-02-23T10:00:00Z',
      verificationMethod: 'did:web:tu.ac.th#key-1',
      proofPurpose: 'assertionMethod',
      proofValue: 'mock-proof',
    },
  }

  const mockVcResult = {
    vcId: 'vc-tu-ac-th-cs101-6501234-2567-1',
    status: 'issued',
    vc: mockVc,
  }

  beforeEach(async () => {
    const mockVcService = {
      issueVC: jest.fn().mockResolvedValue(mockVcResult),
      getVC: jest.fn(),
      revokeVC: jest.fn(),
      generateChallenge: jest.fn(),
      validateChallenge: jest.fn(),
    }

    const mockVcRepo = {
      findByVcId: jest.fn(),
      findByStudentId: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      existsByVcId: jest.fn(),
      countByVcIdPrefix: jest.fn().mockResolvedValue(0),
    }

    const mockStudentSvc = {
      findByStudentId: jest.fn().mockResolvedValue({
        id: 'uuid-1',
        studentId: '6501234',
        did: 'did:web:tu.ac.th:students:6501234',
        status: 'active',
      }),
      findByDid: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }

    const mockCacheManager = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SisService,
        { provide: VCService, useValue: mockVcService },
        { provide: VCRepository, useValue: mockVcRepo },
        { provide: StudentService, useValue: mockStudentSvc },
        { provide: ConfigService, useValue: mockConfig },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile()

    service = module.get<SisService>(SisService)
    vcService = module.get(VCService)
    vcRepo = module.get(VCRepository)
    studentService = module.get(StudentService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('grade.recorded', () => {
    it('should issue VC successfully', async () => {
      const result = await service.processWebhook(baseWebhookDto)

      expect(result.received).toBe(true)
      expect(result.event).toBe('grade.recorded')
      expect(result.vcId).toBe('vc-tu-ac-th-cs101-6501234-2567-1')
      expect(vcService.issueVC).toHaveBeenCalled()
      expect(studentService.findByStudentId).toHaveBeenCalledWith('6501234')
    })

    it('should auto-create student if not found', async () => {
      studentService.findByStudentId.mockRejectedValue(
        new UniLinkException(UniLinkErrorCode.STUDENT_NOT_FOUND, 404, 'Not found'),
      )

      const result = await service.processWebhook(baseWebhookDto)

      expect(result.received).toBe(true)
      expect(studentService.create).toHaveBeenCalledWith({ studentId: '6501234' })
      expect(vcService.issueVC).toHaveBeenCalled()
    })

    it('should return existing VC if duplicate (idempotent)', async () => {
      vcService.issueVC.mockRejectedValue(
        new UniLinkException(UniLinkErrorCode.VC_ISSUE_FAILED, 409, 'Already exists'),
      )

      const result = await service.processWebhook(baseWebhookDto)

      expect(result.received).toBe(true)
      expect(result.event).toBe('grade.recorded')
      expect(result.vcId).toBe('vc-tu-ac-th-cs101-6501234-2567-1')
    })

    it('should calculate correct gradePoint from grade A', async () => {
      await service.processWebhook(baseWebhookDto)

      const callArg = vcService.issueVC.mock.calls[0]![0]
      expect(callArg.gradePoint).toBe(4.0)
    })

    it('should calculate correct gradePoint from grade B+', async () => {
      const dto = { ...baseWebhookDto, grade: 'B+' }

      await service.processWebhook(dto)

      const callArg = vcService.issueVC.mock.calls[0]![0]
      expect(callArg.gradePoint).toBe(3.5)
    })

    it('should calculate correct gradePoint from grade F', async () => {
      const dto = { ...baseWebhookDto, grade: 'F' }

      await service.processWebhook(dto)

      const callArg = vcService.issueVC.mock.calls[0]![0]
      expect(callArg.gradePoint).toBe(0.0)
    })

    it('should propagate VC issuance failure (non-duplicate)', async () => {
      vcService.issueVC.mockRejectedValue(
        new UniLinkException(UniLinkErrorCode.VC_ISSUE_FAILED, 500, 'Signing error'),
      )

      await expect(service.processWebhook(baseWebhookDto)).rejects.toThrow(UniLinkException)
    })
  })

  describe('grade.updated', () => {
    it('should revoke old VC and issue new one with version', async () => {
      const dto: SisWebhookDto = { ...baseWebhookDto, event: 'grade.updated', grade: 'B+' }

      vcService.getVC.mockResolvedValue({
        vcId: 'vc-tu-ac-th-cs101-6501234-2567-1',
        status: 'active',
        vc: mockVc as unknown as Record<string, unknown>,
        issuedAt: new Date(),
        revokedAt: null,
      })
      vcRepo.countByVcIdPrefix.mockResolvedValue(1)
      vcService.issueVC.mockResolvedValue({
        ...mockVcResult,
        vcId: 'vc-tu-ac-th-cs101-6501234-2567-1-v2',
      })

      const result = await service.processWebhook(dto)

      expect(result.received).toBe(true)
      expect(result.event).toBe('grade.updated')
      expect(result.vcId).toBe('vc-tu-ac-th-cs101-6501234-2567-1-v2')
      expect(vcService.revokeVC).toHaveBeenCalledWith(
        'vc-tu-ac-th-cs101-6501234-2567-1',
        'Grade updated by SIS',
      )
      expect(vcService.issueVC).toHaveBeenCalledWith(
        expect.objectContaining({ grade: 'B+', gradePoint: 3.5 }),
        { vcIdOverride: 'vc-tu-ac-th-cs101-6501234-2567-1-v2' },
      )
    })

    it('should issue without version when no existing VC', async () => {
      const dto: SisWebhookDto = { ...baseWebhookDto, event: 'grade.updated', grade: 'B+' }

      vcService.getVC.mockRejectedValue(
        new UniLinkException(UniLinkErrorCode.VC_NOT_FOUND, 404, 'Not found'),
      )
      vcRepo.countByVcIdPrefix.mockResolvedValue(0)

      const result = await service.processWebhook(dto)

      expect(result.received).toBe(true)
      expect(vcService.revokeVC).not.toHaveBeenCalled()
      expect(vcService.issueVC).toHaveBeenCalledWith(
        expect.objectContaining({ grade: 'B+' }),
        { vcIdOverride: 'vc-tu-ac-th-cs101-6501234-2567-1' },
      )
    })
  })

  describe('grade.cancelled', () => {
    it('should revoke VC when found', async () => {
      const dto: SisWebhookDto = { ...baseWebhookDto, event: 'grade.cancelled' }

      vcService.getVC.mockResolvedValue({
        vcId: 'vc-tu-ac-th-cs101-6501234-2567-1',
        status: 'active',
        vc: mockVc as unknown as Record<string, unknown>,
        issuedAt: new Date(),
        revokedAt: null,
      })

      const result = await service.processWebhook(dto)

      expect(result.received).toBe(true)
      expect(result.event).toBe('grade.cancelled')
      expect(vcService.revokeVC).toHaveBeenCalledWith(
        'vc-tu-ac-th-cs101-6501234-2567-1',
        'Grade cancelled by SIS',
      )
    })

    it('should not throw when VC not found', async () => {
      const dto: SisWebhookDto = { ...baseWebhookDto, event: 'grade.cancelled' }

      vcService.getVC.mockRejectedValue(
        new UniLinkException(UniLinkErrorCode.VC_NOT_FOUND, 404, 'Not found'),
      )
      vcRepo.countByVcIdPrefix.mockResolvedValue(0)

      const result = await service.processWebhook(dto)

      expect(result.received).toBe(true)
      expect(result.event).toBe('grade.cancelled')
    })

    it('should not throw when VC already revoked', async () => {
      const dto: SisWebhookDto = { ...baseWebhookDto, event: 'grade.cancelled' }

      vcService.getVC.mockResolvedValue({
        vcId: 'vc-tu-ac-th-cs101-6501234-2567-1',
        status: 'revoked',
        vc: mockVc as unknown as Record<string, unknown>,
        issuedAt: new Date(),
        revokedAt: new Date(),
      })
      vcRepo.countByVcIdPrefix.mockResolvedValue(1)

      const result = await service.processWebhook(dto)

      expect(result.received).toBe(true)
      expect(vcService.revokeVC).not.toHaveBeenCalled()
    })
  })
})
