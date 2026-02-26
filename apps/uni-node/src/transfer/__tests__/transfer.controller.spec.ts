import { Test, TestingModule } from '@nestjs/testing'
import { TransferController } from '../transfer.controller'
import { TransferService } from '../transfer.service'
import { UniLinkException } from '@unilink/dto'
import type { TransferResponse } from '@unilink/dto'

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

describe('TransferController', () => {
  let controller: TransferController
  let transferService: jest.Mocked<TransferService>

  const mockTransferResponse: TransferResponse = {
    id: 'uuid-transfer-1',
    transferId: 'transfer-tu-ac-th-cs101-6501234-1708934400000',
    studentId: '6501234',
    sourceVcId: 'vc-tu-ac-th-cs101-6501234-2567-1',
    sourceCourse: 'CS101',
    targetNode: 'chula.ac.th',
    targetCourse: 'CPE101',
    status: 'pending',
    requestedAt: '2025-06-01T00:00:00.000Z',
  }

  beforeEach(async () => {
    const mockService = {
      createTransferRequest: jest.fn(),
      getTransfer: jest.fn(),
      approveTransfer: jest.fn(),
      rejectTransfer: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransferController],
      providers: [
        { provide: TransferService, useValue: mockService },
      ],
    }).compile()

    controller = module.get<TransferController>(TransferController)
    transferService = module.get(TransferService)
  })

  describe('POST /transfer/request', () => {
    it('should create a transfer and return 201 with ApiResponse', async () => {
      transferService.createTransferRequest.mockResolvedValue(mockTransferResponse)

      const result = await controller.createTransfer({
        studentId: '6501234',
        sourceVcId: 'vc-tu-ac-th-cs101-6501234-2567-1',
        sourceCourseId: 'CS101',
        targetNodeId: 'chula.ac.th',
        targetCourseId: 'CPE101',
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTransferResponse)
      expect(result.timestamp).toBeDefined()
      expect(transferService.createTransferRequest).toHaveBeenCalledTimes(1)
    })

    it('should pass correct DTO to service', async () => {
      transferService.createTransferRequest.mockResolvedValue(mockTransferResponse)

      const dto = {
        studentId: '6501234',
        sourceVcId: 'vc-tu-ac-th-cs101-6501234-2567-1',
        sourceCourseId: 'CS101',
        targetNodeId: 'chula.ac.th',
        targetCourseId: 'CPE101',
      }

      await controller.createTransfer(dto)

      expect(transferService.createTransferRequest).toHaveBeenCalledWith(dto)
    })

    it('should propagate service exceptions', async () => {
      transferService.createTransferRequest.mockRejectedValue(
        new UniLinkException('TRANSFER_GRADE_TOO_LOW', 400, 'Grade too low'),
      )

      await expect(
        controller.createTransfer({
          studentId: '6501234',
          sourceVcId: 'vc-test',
          sourceCourseId: 'CS101',
          targetNodeId: 'chula.ac.th',
        }),
      ).rejects.toThrow(UniLinkException)
    })
  })

  describe('GET /transfer/:transferId', () => {
    it('should return transfer details in ApiResponse', async () => {
      transferService.getTransfer.mockResolvedValue(mockTransferResponse)

      const result = await controller.getTransfer(mockTransferResponse.transferId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTransferResponse)
      expect(result.data?.transferId).toBe(mockTransferResponse.transferId)
    })

    it('should propagate TRANSFER_NOT_FOUND exception', async () => {
      transferService.getTransfer.mockRejectedValue(
        new UniLinkException('TRANSFER_NOT_FOUND', 404, 'Not found'),
      )

      await expect(
        controller.getTransfer('nonexistent'),
      ).rejects.toThrow(UniLinkException)
    })
  })

  describe('PUT /transfer/:transferId/approve', () => {
    it('should approve transfer and return ApiResponse', async () => {
      const approvedResponse: TransferResponse = {
        ...mockTransferResponse,
        status: 'approved',
        reviewedBy: 'system-admin',
        reviewNote: 'Approved per policy',
        transferVcId: 'vc-transfer-test',
        reviewedAt: '2025-06-02T00:00:00.000Z',
      }
      transferService.approveTransfer.mockResolvedValue(approvedResponse)

      const result = await controller.approveTransfer(
        mockTransferResponse.transferId,
        { reviewNote: 'Approved per policy' },
      )

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('approved')
      expect(result.data?.transferVcId).toBe('vc-transfer-test')
    })

    it('should propagate TRANSFER_ALREADY_PROCESSED exception', async () => {
      transferService.approveTransfer.mockRejectedValue(
        new UniLinkException('TRANSFER_ALREADY_PROCESSED', 409, 'Already processed'),
      )

      await expect(
        controller.approveTransfer(mockTransferResponse.transferId, {}),
      ).rejects.toThrow(UniLinkException)
    })

    it('should call service with transferId, reviewedBy, and reviewNote', async () => {
      transferService.approveTransfer.mockResolvedValue({
        ...mockTransferResponse,
        status: 'approved',
      })

      await controller.approveTransfer(
        'test-transfer-id',
        { reviewNote: 'Looks good' },
      )

      expect(transferService.approveTransfer).toHaveBeenCalledWith(
        'test-transfer-id',
        'system-admin',
        'Looks good',
      )
    })
  })

  describe('PUT /transfer/:transferId/reject', () => {
    it('should reject transfer and return ApiResponse', async () => {
      const rejectedResponse: TransferResponse = {
        ...mockTransferResponse,
        status: 'rejected',
        reviewedBy: 'system-admin',
        reviewNote: 'Insufficient credits',
        reviewedAt: '2025-06-02T00:00:00.000Z',
      }
      transferService.rejectTransfer.mockResolvedValue(rejectedResponse)

      const result = await controller.rejectTransfer(
        mockTransferResponse.transferId,
        { reviewNote: 'Insufficient credits' },
      )

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('rejected')
      expect(result.data?.reviewNote).toBe('Insufficient credits')
    })

    it('should propagate TRANSFER_ALREADY_PROCESSED exception', async () => {
      transferService.rejectTransfer.mockRejectedValue(
        new UniLinkException('TRANSFER_ALREADY_PROCESSED', 409, 'Already processed'),
      )

      await expect(
        controller.rejectTransfer(mockTransferResponse.transferId, {}),
      ).rejects.toThrow(UniLinkException)
    })
  })
})
