import { Test, TestingModule } from '@nestjs/testing'
import { ExternalController } from '../external.controller'
import { ExternalService } from '../external.service'

// Mock packages to avoid ESM dependency issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

describe('ExternalController', () => {
  let controller: ExternalController

  const mockExternalService = {
    listRequests: jest.fn(),
    getDetail: jest.fn(),
    submitRequest: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExternalController],
      providers: [
        { provide: ExternalService, useValue: mockExternalService },
      ],
    }).compile()

    controller = module.get<ExternalController>(ExternalController)
  })

  // ─── GET /external ──────────────────────────────────────

  describe('GET /external', () => {
    it('should return paginated list wrapped in ApiResponse', async () => {
      const mockData = [
        {
          requestId: 'ext-1',
          studentId: '6401001',
          platform: 'Coursera',
          courseName: 'Machine Learning',
          institution: 'Stanford University',
          status: 'pending',
          requestedAt: '2026-02-23T00:00:00.000Z',
        },
      ]
      mockExternalService.listRequests.mockResolvedValue({
        data: mockData,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      })

      const result = await controller.listRequests({})

      expect(result.success).toBe(true)
      expect(result.data?.data).toHaveLength(1)
      expect(result.data?.meta.total).toBe(1)
      expect(result.data?.meta.page).toBe(1)
      expect(result.data?.meta.limit).toBe(20)
      expect(result.data?.meta.totalPages).toBe(1)
      expect(result.timestamp).toBeDefined()
    })

    it('should pass query params to service', async () => {
      mockExternalService.listRequests.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 2, limit: 10, totalPages: 0 },
      })

      await controller.listRequests({
        status: 'pending',
        page: 2,
        limit: 10,
      })

      expect(mockExternalService.listRequests).toHaveBeenCalledWith({
        status: 'pending',
        page: 2,
        limit: 10,
      })
    })

    it('should handle empty list', async () => {
      mockExternalService.listRequests.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      })

      const result = await controller.listRequests({})

      expect(result.data?.data).toHaveLength(0)
      expect(result.data?.meta.total).toBe(0)
    })
  })

  // ─── GET /external/:requestId ───────────────────────────

  describe('GET /external/:requestId', () => {
    it('should return detail wrapped in ApiResponse', async () => {
      const mockDetail = {
        requestId: 'ext-1',
        studentId: '6401001',
        platform: 'Coursera',
        courseName: 'Machine Learning',
        institution: 'Stanford University',
        completionDate: '2026-01-15',
        score: '95',
        hours: 60,
        status: 'pending',
        requestedAt: '2026-02-23T00:00:00.000Z',
      }
      mockExternalService.getDetail.mockResolvedValue(mockDetail)

      const result = await controller.getDetail('ext-1')

      expect(result.success).toBe(true)
      expect(result.data?.requestId).toBe('ext-1')
      expect(result.data?.platform).toBe('Coursera')
    })

    it('should propagate service errors', async () => {
      mockExternalService.getDetail.mockRejectedValue(
        new Error('External credential request ext-999 not found'),
      )

      await expect(controller.getDetail('ext-999')).rejects.toThrow(
        'External credential request ext-999 not found',
      )
    })
  })

  // ─── POST /external/submit ──────────────────────────────

  describe('POST /external/submit', () => {
    it('should create request and return ApiResponse with 201', async () => {
      const mockDetail = {
        requestId: 'ext-new',
        studentId: '6401001',
        platform: 'edX',
        courseName: 'Data Science',
        institution: 'MIT',
        completionDate: '2026-01-20',
        status: 'pending',
        requestedAt: '2026-02-23T00:00:00.000Z',
      }
      mockExternalService.submitRequest.mockResolvedValue(mockDetail)

      const result = await controller.submitRequest({
        studentId: '6401001',
        platform: 'edX',
        courseName: 'Data Science',
        institution: 'MIT',
        completionDate: '2026-01-20',
      })

      expect(result.success).toBe(true)
      expect(result.data?.requestId).toBe('ext-new')
      expect(result.data?.status).toBe('pending')
    })

    it('should propagate validation errors', async () => {
      mockExternalService.submitRequest.mockRejectedValue(
        new Error('Platform "BadPlatform" is not supported'),
      )

      await expect(
        controller.submitRequest({
          studentId: '6401001',
          platform: 'BadPlatform',
          courseName: 'Test',
          institution: 'Test Inst',
          completionDate: '2026-01-01',
        }),
      ).rejects.toThrow('Platform "BadPlatform" is not supported')
    })
  })

  // ─── PUT /external/:requestId/approve ───────────────────

  describe('PUT /external/:requestId/approve', () => {
    it('should approve and return updated detail', async () => {
      const mockDetail = {
        requestId: 'ext-1',
        studentId: '6401001',
        platform: 'Coursera',
        courseName: 'Machine Learning',
        institution: 'Stanford University',
        completionDate: '2026-01-15',
        status: 'approved',
        recognizedCourseId: 'CS101',
        recognizedCredits: 3,
        decidedAt: '2026-02-23T10:00:00.000Z',
        requestedAt: '2026-02-20T00:00:00.000Z',
      }
      mockExternalService.approve.mockResolvedValue(mockDetail)

      const result = await controller.approve(
        'ext-1',
        { recognizedCourseId: 'CS101', recognizedCredits: 3 },
        'admin-user-did',
      )

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('approved')
      expect(result.data?.recognizedCourseId).toBe('CS101')
      expect(result.data?.recognizedCredits).toBe(3)
    })

    it('should pass reviewedBy from CurrentUser', async () => {
      mockExternalService.approve.mockResolvedValue({
        requestId: 'ext-1',
        status: 'approved',
      })

      await controller.approve(
        'ext-1',
        { recognizedCourseId: 'CS101', recognizedCredits: 3 },
        'reviewer-did-123',
      )

      expect(mockExternalService.approve).toHaveBeenCalledWith(
        'ext-1',
        { recognizedCourseId: 'CS101', recognizedCredits: 3 },
        'reviewer-did-123',
      )
    })

    it('should propagate service errors on approve', async () => {
      mockExternalService.approve.mockRejectedValue(
        new Error('External credential request ext-1 has already been approved'),
      )

      await expect(
        controller.approve(
          'ext-1',
          { recognizedCourseId: 'CS101', recognizedCredits: 3 },
          'admin',
        ),
      ).rejects.toThrow('already been approved')
    })
  })

  // ─── PUT /external/:requestId/reject ────────────────────

  describe('PUT /external/:requestId/reject', () => {
    it('should reject and return updated detail', async () => {
      const mockDetail = {
        requestId: 'ext-2',
        status: 'rejected',
        reviewNote: 'Score too low',
        decidedAt: '2026-02-23T10:00:00.000Z',
      }
      mockExternalService.reject.mockResolvedValue(mockDetail)

      const result = await controller.reject(
        'ext-2',
        { note: 'Score too low' },
        'admin-user-did',
      )

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('rejected')
    })

    it('should propagate service errors on reject', async () => {
      mockExternalService.reject.mockRejectedValue(
        new Error('External credential request ext-999 not found'),
      )

      await expect(
        controller.reject('ext-999', {}, 'admin'),
      ).rejects.toThrow('not found')
    })
  })
})
