import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { TransferService } from '../transfer.service'
import { TransferRepository } from '../transfer.repository'
import { VCService } from '../../vc/vc.service'
import { VCRepository } from '../../vc/vc.repository'
import { StudentService } from '../../student/student.service'
import { UniLinkException } from '@unilink/dto'

// Mock @unilink/crypto to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
  verifyRaw: jest.fn().mockResolvedValue(true),
}))

// Mock @unilink/vc-core to avoid ESM issues
jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn().mockResolvedValue({}),
  verifyVC: jest.fn(),
  verifyVP: jest.fn(),
  isRevoked: jest.fn(),
  didWebToUrl: jest.fn(),
  getDIDDocument: jest.fn(),
  buildStatusListCredential: jest.fn(),
  createStatusList: jest.fn(),
  setRevoked: jest.fn(),
}))

describe('TransferService', () => {
  let service: TransferService

  const mockTransferRepo = {
    findByTransferId: jest.fn(),
    findByStudentId: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    existsBySourceVcAndTarget: jest.fn(),
  }

  const mockVcService = {
    issueVC: jest.fn(),
  }

  const mockVcRepo = {
    findByVcId: jest.fn(),
  }

  const mockStudentService = {
    findByStudentId: jest.fn(),
  }

  const mockConfigService = {
    get: jest.fn((key: string, def?: string) => {
      const map: Record<string, string> = {
        NODE_DOMAIN: 'tu.ac.th',
        NODE_ID: 'tu.ac.th',
      }
      return map[key] ?? def
    }),
  }

  // Mock source VC document with grade info
  const mockVcDocument = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'vc-tu-ac-th-cs101-6501234-2567-1',
    type: ['VerifiableCredential', 'CourseCreditCredential'],
    issuer: 'did:web:tu.ac.th',
    issuanceDate: '2025-01-01T00:00:00Z',
    credentialSubject: {
      studentId: '6501234',
      courseId: 'CS101',
      grade: 'A',
      gradePoint: 4.0,
      semester: '1',
      academicYear: '2567',
    },
  }

  const mockVcEntity = {
    id: 'uuid-vc-1',
    vcId: 'vc-tu-ac-th-cs101-6501234-2567-1',
    studentId: '6501234',
    vcType: 'CourseCreditCredential',
    courseId: 'CS101',
    vcDocument: mockVcDocument,
    statusIndex: 0,
    status: 'active',
    issuedAt: new Date('2025-01-01'),
    revokedAt: null,
    revokeReason: null,
    createdAt: new Date('2025-01-01'),
  }

  const mockTransferEntity = {
    id: 'uuid-transfer-1',
    transferId: 'transfer-tu-ac-th-cs101-6501234-1708934400000',
    studentId: '6501234',
    sourceVcId: 'vc-tu-ac-th-cs101-6501234-2567-1',
    sourceCourse: 'CS101',
    targetNode: 'chula.ac.th',
    targetCourse: 'CPE101',
    status: 'pending',
    reviewedBy: null,
    reviewNote: null,
    transferVcId: null,
    requestedAt: new Date('2025-06-01'),
    reviewedAt: null,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01'),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferService,
        { provide: TransferRepository, useValue: mockTransferRepo },
        { provide: VCService, useValue: mockVcService },
        { provide: VCRepository, useValue: mockVcRepo },
        { provide: StudentService, useValue: mockStudentService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<TransferService>(TransferService)

    // Default mocks
    mockStudentService.findByStudentId.mockResolvedValue({
      id: 'uuid-student-1',
      studentId: '6501234',
      did: 'did:web:tu.ac.th:students:6501234',
    })
    mockVcRepo.findByVcId.mockResolvedValue(mockVcEntity)
    mockTransferRepo.existsBySourceVcAndTarget.mockResolvedValue(false)
    mockTransferRepo.create.mockResolvedValue(mockTransferEntity)
  })

  // ─── createTransferRequest ───────────────────────────────

  describe('createTransferRequest', () => {
    const validDto = {
      studentId: '6501234',
      sourceVcId: 'vc-tu-ac-th-cs101-6501234-2567-1',
      sourceCourseId: 'CS101',
      targetNodeId: 'chula.ac.th',
      targetCourseId: 'CPE101',
    }

    it('should create a transfer request with pending status', async () => {
      const result = await service.createTransferRequest(validDto)

      expect(result.status).toBe('pending')
      expect(result.studentId).toBe('6501234')
      expect(result.sourceVcId).toBe('vc-tu-ac-th-cs101-6501234-2567-1')
      expect(result.sourceCourse).toBe('CS101')
      expect(result.targetNode).toBe('chula.ac.th')
      expect(mockTransferRepo.create).toHaveBeenCalledTimes(1)
    })

    it('should generate a valid transfer ID', async () => {
      await service.createTransferRequest(validDto)

      const createCall = mockTransferRepo.create.mock.calls[0][0]
      expect(createCall.transferId).toMatch(/^transfer-tu-ac-th-cs101-6501234-\d+$/)
    })

    it('should throw STUDENT_NOT_FOUND when student does not exist', async () => {
      mockStudentService.findByStudentId.mockRejectedValue(
        new UniLinkException('STUDENT_NOT_FOUND', 404, 'Student not found'),
      )

      await expect(
        service.createTransferRequest(validDto),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.createTransferRequest(validDto)
      } catch (e) {
        expect((e as UniLinkException).code).toBe('STUDENT_NOT_FOUND')
      }
    })

    it('should throw VC_NOT_FOUND when source VC does not exist', async () => {
      mockVcRepo.findByVcId.mockResolvedValue(null)

      await expect(
        service.createTransferRequest(validDto),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.createTransferRequest(validDto)
      } catch (e) {
        expect((e as UniLinkException).code).toBe('VC_NOT_FOUND')
      }
    })

    it('should throw VC_REVOKED when source VC is revoked', async () => {
      mockVcRepo.findByVcId.mockResolvedValue({
        ...mockVcEntity,
        status: 'revoked',
      })

      await expect(
        service.createTransferRequest(validDto),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.createTransferRequest(validDto)
      } catch (e) {
        expect((e as UniLinkException).code).toBe('VC_REVOKED')
      }
    })

    it('should throw VC_STUDENT_MISMATCH when VC does not belong to student', async () => {
      mockVcRepo.findByVcId.mockResolvedValue({
        ...mockVcEntity,
        studentId: '9999999',
      })

      await expect(
        service.createTransferRequest(validDto),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.createTransferRequest(validDto)
      } catch (e) {
        expect((e as UniLinkException).code).toBe('VC_STUDENT_MISMATCH')
      }
    })

    it('should throw TRANSFER_GRADE_TOO_LOW when grade < C+ (2.5)', async () => {
      mockVcRepo.findByVcId.mockResolvedValue({
        ...mockVcEntity,
        vcDocument: {
          ...mockVcDocument,
          credentialSubject: {
            ...mockVcDocument.credentialSubject,
            gradePoint: 2.0, // C (below C+)
          },
        },
      })

      await expect(
        service.createTransferRequest(validDto),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.createTransferRequest(validDto)
      } catch (e) {
        expect((e as UniLinkException).code).toBe('TRANSFER_GRADE_TOO_LOW')
      }
    })

    it('should throw TRANSFER_ALREADY_EXISTS when duplicate transfer exists', async () => {
      mockTransferRepo.existsBySourceVcAndTarget.mockResolvedValue(true)

      await expect(
        service.createTransferRequest(validDto),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.createTransferRequest(validDto)
      } catch (e) {
        expect((e as UniLinkException).code).toBe('TRANSFER_ALREADY_EXISTS')
      }
    })

    it('should accept grade exactly C+ (2.5)', async () => {
      mockVcRepo.findByVcId.mockResolvedValue({
        ...mockVcEntity,
        vcDocument: {
          ...mockVcDocument,
          credentialSubject: {
            ...mockVcDocument.credentialSubject,
            gradePoint: 2.5,
          },
        },
      })

      const result = await service.createTransferRequest(validDto)

      expect(result.status).toBe('pending')
    })
  })

  // ─── getTransfer ─────────────────────────────────────────

  describe('getTransfer', () => {
    it('should return transfer details', async () => {
      mockTransferRepo.findByTransferId.mockResolvedValue(mockTransferEntity)

      const result = await service.getTransfer(mockTransferEntity.transferId)

      expect(result.transferId).toBe(mockTransferEntity.transferId)
      expect(result.studentId).toBe('6501234')
      expect(result.status).toBe('pending')
    })

    it('should throw TRANSFER_NOT_FOUND when transfer does not exist', async () => {
      mockTransferRepo.findByTransferId.mockResolvedValue(null)

      await expect(
        service.getTransfer('nonexistent-transfer'),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.getTransfer('nonexistent-transfer')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('TRANSFER_NOT_FOUND')
      }
    })
  })

  // ─── approveTransfer ────────────────────────────────────

  describe('approveTransfer', () => {
    it('should approve a pending transfer and issue CreditTransferCredential', async () => {
      mockTransferRepo.findByTransferId.mockResolvedValue(mockTransferEntity)
      mockVcService.issueVC.mockResolvedValue({
        vcId: 'vc-transfer-transfer-tu-ac-th-cs101-6501234-1708934400000',
        status: 'issued',
        vc: {},
      })
      mockTransferRepo.updateStatus.mockResolvedValue({
        ...mockTransferEntity,
        status: 'approved',
        reviewedBy: 'admin@tu.ac.th',
        reviewNote: 'Approved per policy',
        transferVcId: 'vc-transfer-transfer-tu-ac-th-cs101-6501234-1708934400000',
        reviewedAt: new Date(),
      })

      const result = await service.approveTransfer(
        mockTransferEntity.transferId,
        'admin@tu.ac.th',
        'Approved per policy',
      )

      expect(result.status).toBe('approved')
      expect(result.transferVcId).toBe(
        'vc-transfer-transfer-tu-ac-th-cs101-6501234-1708934400000',
      )
      expect(mockVcService.issueVC).toHaveBeenCalledTimes(1)
    })

    it('should call issueVC with CreditTransferCredential type and vcIdOverride', async () => {
      mockTransferRepo.findByTransferId.mockResolvedValue(mockTransferEntity)
      mockVcService.issueVC.mockResolvedValue({
        vcId: 'vc-transfer-test',
        status: 'issued',
        vc: {},
      })
      mockTransferRepo.updateStatus.mockResolvedValue({
        ...mockTransferEntity,
        status: 'approved',
        transferVcId: 'vc-transfer-test',
        reviewedAt: new Date(),
      })

      await service.approveTransfer(
        mockTransferEntity.transferId,
        'admin@tu.ac.th',
      )

      const [issueDto, options] = mockVcService.issueVC.mock.calls[0]
      expect(issueDto.vcType).toBe('CreditTransferCredential')
      expect(issueDto.studentId).toBe('6501234')
      expect(issueDto.courseId).toBe('CS101')
      expect(options.vcIdOverride).toMatch(/^vc-transfer-/)
    })

    it('should throw TRANSFER_NOT_FOUND when transfer does not exist', async () => {
      mockTransferRepo.findByTransferId.mockResolvedValue(null)

      await expect(
        service.approveTransfer('nonexistent', 'admin@tu.ac.th'),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.approveTransfer('nonexistent', 'admin@tu.ac.th')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('TRANSFER_NOT_FOUND')
      }
    })

    it('should throw TRANSFER_ALREADY_PROCESSED when transfer is already approved', async () => {
      mockTransferRepo.findByTransferId.mockResolvedValue({
        ...mockTransferEntity,
        status: 'approved',
      })

      await expect(
        service.approveTransfer(
          mockTransferEntity.transferId,
          'admin@tu.ac.th',
        ),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.approveTransfer(
          mockTransferEntity.transferId,
          'admin@tu.ac.th',
        )
      } catch (e) {
        expect((e as UniLinkException).code).toBe('TRANSFER_ALREADY_PROCESSED')
      }
    })

    it('should throw TRANSFER_ALREADY_PROCESSED when transfer is already rejected', async () => {
      mockTransferRepo.findByTransferId.mockResolvedValue({
        ...mockTransferEntity,
        status: 'rejected',
      })

      await expect(
        service.approveTransfer(
          mockTransferEntity.transferId,
          'admin@tu.ac.th',
        ),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.approveTransfer(
          mockTransferEntity.transferId,
          'admin@tu.ac.th',
        )
      } catch (e) {
        expect((e as UniLinkException).code).toBe('TRANSFER_ALREADY_PROCESSED')
      }
    })
  })

  // ─── rejectTransfer ─────────────────────────────────────

  describe('rejectTransfer', () => {
    it('should reject a pending transfer', async () => {
      mockTransferRepo.findByTransferId.mockResolvedValue(mockTransferEntity)
      mockTransferRepo.updateStatus.mockResolvedValue({
        ...mockTransferEntity,
        status: 'rejected',
        reviewedBy: 'admin@tu.ac.th',
        reviewNote: 'Grade too low per department policy',
        reviewedAt: new Date(),
      })

      const result = await service.rejectTransfer(
        mockTransferEntity.transferId,
        'admin@tu.ac.th',
        'Grade too low per department policy',
      )

      expect(result.status).toBe('rejected')
      expect(result.reviewedBy).toBe('admin@tu.ac.th')
      expect(result.reviewNote).toBe('Grade too low per department policy')
    })

    it('should throw TRANSFER_ALREADY_PROCESSED when transfer is already processed', async () => {
      mockTransferRepo.findByTransferId.mockResolvedValue({
        ...mockTransferEntity,
        status: 'approved',
      })

      await expect(
        service.rejectTransfer(
          mockTransferEntity.transferId,
          'admin@tu.ac.th',
        ),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.rejectTransfer(
          mockTransferEntity.transferId,
          'admin@tu.ac.th',
        )
      } catch (e) {
        expect((e as UniLinkException).code).toBe('TRANSFER_ALREADY_PROCESSED')
      }
    })

    it('should throw TRANSFER_NOT_FOUND when transfer does not exist', async () => {
      mockTransferRepo.findByTransferId.mockResolvedValue(null)

      await expect(
        service.rejectTransfer('nonexistent', 'admin@tu.ac.th'),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.rejectTransfer('nonexistent', 'admin@tu.ac.th')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('TRANSFER_NOT_FOUND')
      }
    })
  })
})
