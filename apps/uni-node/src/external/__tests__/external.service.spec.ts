import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { ExternalService } from '../external.service'
import { ExternalRepository } from '../external.repository'
import { VCService } from '../../vc/vc.service'
import { StudentService } from '../../student/student.service'

// Mock packages to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

describe('ExternalService', () => {
  let service: ExternalService

  const mockExternalRepo = {
    findAll: jest.fn(),
    findByRequestId: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    countCreditsForStudent: jest.fn(),
  }

  const mockVcService = {
    issueVC: jest.fn(),
  }

  const mockStudentService = {
    findByStudentId: jest.fn(),
  }

  const mockConfigService = {
    get: jest.fn(<T>(key: string, defaultValue?: T): T => {
      const configMap: Record<string, string> = {
        NODE_DOMAIN: 'tu.ac.th',
        NODE_ID: 'tu.ac.th',
      }
      const value = configMap[key]
      return (value !== undefined ? value : defaultValue) as T
    }),
  }

  const mockPendingEntity = {
    id: 'uuid-1',
    requestId: 'ext-tu-ac-th-6401001-1708000000000',
    studentId: '6401001',
    platform: 'Coursera',
    platformTier: 1,
    courseName: 'Machine Learning',
    institution: 'Stanford University',
    completionDate: new Date('2026-01-15'),
    score: 95,
    completionHours: 60,
    certificateUrl: 'https://coursera.org/verify/abc123',
    certificatePdfUrl: null,
    verificationUrl: 'https://coursera.org/verify/abc123',
    requestedCourseId: 'CS101',
    originalVcId: null,
    status: 'pending',
    recognizedCourseId: null,
    recognizedCredits: null,
    reviewedBy: null,
    reviewNote: null,
    issuedVcId: null,
    requestedAt: new Date('2026-02-20T00:00:00Z'),
    decidedAt: null,
    createdAt: new Date('2026-02-20T00:00:00Z'),
    updatedAt: new Date('2026-02-20T00:00:00Z'),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalService,
        { provide: ExternalRepository, useValue: mockExternalRepo },
        { provide: VCService, useValue: mockVcService },
        { provide: StudentService, useValue: mockStudentService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<ExternalService>(ExternalService)

    // Default mocks
    mockStudentService.findByStudentId.mockResolvedValue({
      studentId: '6401001',
      did: 'did:web:tu.ac.th:students:6401001',
    })
    mockExternalRepo.findByRequestId.mockResolvedValue(mockPendingEntity)
    mockExternalRepo.countCreditsForStudent.mockResolvedValue(0)
    mockVcService.issueVC.mockResolvedValue({
      vcId: 'vc-achievement-ext-1',
      status: 'issued',
      vc: { id: 'vc-achievement-ext-1' },
    })
  })

  // ─── submitRequest ──────────────────────────────────────

  describe('submitRequest', () => {
    it('should create request for supported platform', async () => {
      mockExternalRepo.create.mockResolvedValue({
        ...mockPendingEntity,
        requestId: 'ext-tu-ac-th-6401001-new',
      })

      const result = await service.submitRequest({
        studentId: '6401001',
        platform: 'Coursera',
        courseName: 'Machine Learning',
        institution: 'Stanford University',
        completionDate: '2026-01-15',
        score: 95,
        completionHours: 60,
      })

      expect(result.requestId).toBeDefined()
      expect(result.platform).toBe('Coursera')
      expect(result.status).toBe('pending')
      expect(mockStudentService.findByStudentId).toHaveBeenCalledWith(
        '6401001',
      )
    })

    it('should throw for unsupported platform', async () => {
      await expect(
        service.submitRequest({
          studentId: '6401001',
          platform: 'UnknownPlatform',
          courseName: 'Test',
          institution: 'Test',
          completionDate: '2026-01-15',
        }),
      ).rejects.toThrow('not supported')
    })

    it('should generate requestId with domain and studentId', async () => {
      mockExternalRepo.create.mockImplementation(
        (data: Record<string, unknown>) =>
          Promise.resolve({
            id: 'new-uuid',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      )

      await service.submitRequest({
        studentId: '6401001',
        platform: 'edX',
        courseName: 'Data Science',
        institution: 'MIT',
        completionDate: '2026-01-20',
      })

      const createCall = mockExternalRepo.create.mock.calls[0][0]
      expect(createCall.requestId).toMatch(/^ext-tu-ac-th-6401001-/)
    })

    it('should set correct platformTier for Tier 1 platform', async () => {
      mockExternalRepo.create.mockImplementation(
        (data: Record<string, unknown>) =>
          Promise.resolve({
            id: 'new-uuid',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      )

      await service.submitRequest({
        studentId: '6401001',
        platform: 'Coursera',
        courseName: 'ML',
        institution: 'Stanford',
        completionDate: '2026-01-15',
      })

      const createCall = mockExternalRepo.create.mock.calls[0][0]
      expect(createCall.platformTier).toBe(1)
    })

    it('should set correct platformTier for Tier 2 platform', async () => {
      mockExternalRepo.create.mockImplementation(
        (data: Record<string, unknown>) =>
          Promise.resolve({
            id: 'new-uuid',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      )

      await service.submitRequest({
        studentId: '6401001',
        platform: 'Udemy',
        courseName: 'Python Course',
        institution: 'Udemy Inc',
        completionDate: '2026-01-15',
      })

      const createCall = mockExternalRepo.create.mock.calls[0][0]
      expect(createCall.platformTier).toBe(2)
    })
  })

  // ─── listRequests ───────────────────────────────────────

  describe('listRequests', () => {
    it('should return paginated response with mapped items', async () => {
      mockExternalRepo.findAll.mockResolvedValue({
        data: [mockPendingEntity],
        total: 1,
      })

      const result = await service.listRequests({ page: 1, limit: 20 })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].requestId).toBe(mockPendingEntity.requestId)
      expect(result.data[0].platform).toBe('Coursera')
      expect(result.meta.total).toBe(1)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
      expect(result.meta.totalPages).toBe(1)
    })

    it('should use defaults page=1 and limit=20', async () => {
      mockExternalRepo.findAll.mockResolvedValue({ data: [], total: 0 })

      await service.listRequests()

      expect(mockExternalRepo.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: undefined,
      })
    })
  })

  // ─── getDetail ──────────────────────────────────────────

  describe('getDetail', () => {
    it('should return ExternalDetail when found', async () => {
      const result = await service.getDetail(mockPendingEntity.requestId)

      expect(result.requestId).toBe(mockPendingEntity.requestId)
      expect(result.platform).toBe('Coursera')
      expect(result.courseName).toBe('Machine Learning')
      expect(result.institution).toBe('Stanford University')
      expect(result.score).toBe('95')
      expect(result.hours).toBe(60)
      expect(result.status).toBe('pending')
    })

    it('should throw EXTERNAL_NOT_FOUND when not found', async () => {
      mockExternalRepo.findByRequestId.mockResolvedValue(null)

      await expect(service.getDetail('ext-999')).rejects.toThrow('not found')
    })
  })

  // ─── approve ────────────────────────────────────────────

  describe('approve', () => {
    it('should approve, issue VC, and return updated detail', async () => {
      const approvedEntity = {
        ...mockPendingEntity,
        status: 'approved',
        recognizedCourseId: 'CS101',
        recognizedCredits: 3,
        reviewedBy: 'admin-did',
        issuedVcId: 'vc-achievement-ext-1',
        decidedAt: new Date(),
      }
      mockExternalRepo.updateStatus.mockResolvedValue(approvedEntity)

      const result = await service.approve(
        mockPendingEntity.requestId,
        { recognizedCourseId: 'CS101', recognizedCredits: 3 },
        'admin-did',
      )

      expect(result.status).toBe('approved')
      expect(result.recognizedCourseId).toBe('CS101')
      expect(result.recognizedCredits).toBe(3)
      expect(result.decidedAt).toBeDefined()
    })

    it('should call vcService.issueVC with AchievementCredential type', async () => {
      mockExternalRepo.updateStatus.mockResolvedValue({
        ...mockPendingEntity,
        status: 'approved',
      })

      await service.approve(
        mockPendingEntity.requestId,
        { recognizedCourseId: 'CS101', recognizedCredits: 3 },
        'admin-did',
      )

      expect(mockVcService.issueVC).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: '6401001',
          vcType: 'AchievementCredential',
          courseId: 'CS101',
          grade: 'S',
          gradePoint: 0,
          semester: 'EXT',
        }),
        expect.objectContaining({
          vcIdOverride: expect.stringContaining('vc-achievement-'),
        }),
      )
    })

    it('should throw EXTERNAL_NOT_FOUND when request not found', async () => {
      mockExternalRepo.findByRequestId.mockResolvedValue(null)

      await expect(
        service.approve(
          'ext-999',
          { recognizedCourseId: 'CS101', recognizedCredits: 3 },
          'admin',
        ),
      ).rejects.toThrow('not found')
    })

    it('should throw EXTERNAL_ALREADY_PROCESSED when not pending', async () => {
      mockExternalRepo.findByRequestId.mockResolvedValue({
        ...mockPendingEntity,
        status: 'approved',
      })

      await expect(
        service.approve(
          mockPendingEntity.requestId,
          { recognizedCourseId: 'CS101', recognizedCredits: 3 },
          'admin',
        ),
      ).rejects.toThrow('already been')
    })

    it('should throw EXTERNAL_CREDIT_LIMIT_EXCEEDED when yearly limit exceeded', async () => {
      // Current: 13 credits this year, trying to add 3 → total 16 > 15
      mockExternalRepo.countCreditsForStudent.mockResolvedValueOnce(13)

      await expect(
        service.approve(
          mockPendingEntity.requestId,
          { recognizedCourseId: 'CS101', recognizedCredits: 3 },
          'admin',
        ),
      ).rejects.toThrow('annual limit')
    })

    it('should throw EXTERNAL_CREDIT_LIMIT_EXCEEDED when total limit exceeded', async () => {
      // Yearly check passes (0 + 3 = 3 ≤ 15), but total: 28 + 3 = 31 > 30
      mockExternalRepo.countCreditsForStudent
        .mockResolvedValueOnce(0) // yearly count
        .mockResolvedValueOnce(28) // total count

      await expect(
        service.approve(
          mockPendingEntity.requestId,
          { recognizedCourseId: 'CS101', recognizedCredits: 3 },
          'admin',
        ),
      ).rejects.toThrow('total limit')
    })

    it('should update entity with all approval data', async () => {
      mockExternalRepo.updateStatus.mockResolvedValue({
        ...mockPendingEntity,
        status: 'approved',
      })

      await service.approve(
        mockPendingEntity.requestId,
        { recognizedCourseId: 'CS101', recognizedCredits: 3, note: 'Good job' },
        'admin-did',
      )

      expect(mockExternalRepo.updateStatus).toHaveBeenCalledWith(
        mockPendingEntity.requestId,
        'approved',
        expect.objectContaining({
          recognizedCourseId: 'CS101',
          recognizedCredits: 3,
          reviewedBy: 'admin-did',
          reviewNote: 'Good job',
          issuedVcId: 'vc-achievement-ext-1',
        }),
      )
    })
  })

  // ─── reject ─────────────────────────────────────────────

  describe('reject', () => {
    it('should reject and return updated detail', async () => {
      const rejectedEntity = {
        ...mockPendingEntity,
        status: 'rejected',
        reviewedBy: 'admin-did',
        reviewNote: 'Score too low',
        decidedAt: new Date(),
      }
      mockExternalRepo.updateStatus.mockResolvedValue(rejectedEntity)

      const result = await service.reject(
        mockPendingEntity.requestId,
        { note: 'Score too low' },
        'admin-did',
      )

      expect(result.status).toBe('rejected')
      expect(result.reviewNote).toBe('Score too low')
    })

    it('should throw EXTERNAL_NOT_FOUND when request not found', async () => {
      mockExternalRepo.findByRequestId.mockResolvedValue(null)

      await expect(
        service.reject('ext-999', {}, 'admin'),
      ).rejects.toThrow('not found')
    })

    it('should throw EXTERNAL_ALREADY_PROCESSED when not pending', async () => {
      mockExternalRepo.findByRequestId.mockResolvedValue({
        ...mockPendingEntity,
        status: 'rejected',
      })

      await expect(
        service.reject(mockPendingEntity.requestId, {}, 'admin'),
      ).rejects.toThrow('already been')
    })
  })

  // ─── getPlatformConfig ─────────────────────────────────

  describe('getPlatformConfig', () => {
    it('should return Tier 1 config for Coursera', () => {
      const config = service.getPlatformConfig('Coursera')

      expect(config?.tier).toBe(1)
      expect(config?.minScore).toBe(70)
    })

    it('should return Tier 2 config for Udemy', () => {
      const config = service.getPlatformConfig('Udemy')

      expect(config?.tier).toBe(2)
      expect(config?.minScore).toBe(80)
      expect(config?.minHours).toBe(20)
    })

    it('should return undefined for unknown platform', () => {
      const config = service.getPlatformConfig('UnknownPlatform')

      expect(config).toBeUndefined()
    })
  })
})
