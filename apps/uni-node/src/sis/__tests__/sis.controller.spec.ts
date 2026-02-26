import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { SisController } from '../sis.controller'
import { SisService, SisWebhookResult } from '../sis.service'
import { SisWebhookGuard } from '../guards/sis-webhook.guard'

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

describe('SisController', () => {
  let controller: SisController
  let sisService: jest.Mocked<SisService>

  beforeEach(async () => {
    const mockSisService = {
      processWebhook: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SisController],
      providers: [
        { provide: SisService, useValue: mockSisService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        SisWebhookGuard,
      ],
    }).compile()

    controller = module.get<SisController>(SisController)
    sisService = module.get(SisService)
  })

  describe('POST /sis/webhook', () => {
    it('should handle grade.recorded and return result', async () => {
      const mockResult: SisWebhookResult = {
        received: true,
        event: 'grade.recorded',
        vcId: 'vc-tu-ac-th-cs101-6501234-2567-1',
      }
      sisService.processWebhook.mockResolvedValue(mockResult)

      const result = await controller.handleWebhook({
        event: 'grade.recorded',
        studentId: '6501234',
        courseId: 'CS101',
        grade: 'A',
        semester: '1',
        academicYear: '2567',
        recordedAt: '2026-02-23T10:00:00Z',
      })

      expect(result.received).toBe(true)
      expect(result.event).toBe('grade.recorded')
      expect(result.vcId).toBe('vc-tu-ac-th-cs101-6501234-2567-1')
      expect(sisService.processWebhook).toHaveBeenCalled()
    })

    it('should handle grade.updated and return result', async () => {
      const mockResult: SisWebhookResult = {
        received: true,
        event: 'grade.updated',
        vcId: 'vc-tu-ac-th-cs101-6501234-2567-1-v2',
      }
      sisService.processWebhook.mockResolvedValue(mockResult)

      const result = await controller.handleWebhook({
        event: 'grade.updated',
        studentId: '6501234',
        courseId: 'CS101',
        grade: 'B+',
        semester: '1',
        academicYear: '2567',
        recordedAt: '2026-02-23T11:00:00Z',
      })

      expect(result.received).toBe(true)
      expect(result.event).toBe('grade.updated')
      expect(result.vcId).toBe('vc-tu-ac-th-cs101-6501234-2567-1-v2')
    })

    it('should handle grade.cancelled and return result', async () => {
      const mockResult: SisWebhookResult = {
        received: true,
        event: 'grade.cancelled',
      }
      sisService.processWebhook.mockResolvedValue(mockResult)

      const result = await controller.handleWebhook({
        event: 'grade.cancelled',
        studentId: '6501234',
        courseId: 'CS101',
        grade: 'A',
        semester: '1',
        academicYear: '2567',
        recordedAt: '2026-02-23T12:00:00Z',
      })

      expect(result.received).toBe(true)
      expect(result.event).toBe('grade.cancelled')
      expect(result.vcId).toBeUndefined()
    })

    it('should pass the correct DTO to service', async () => {
      const mockResult: SisWebhookResult = {
        received: true,
        event: 'grade.recorded',
        vcId: 'vc-test',
      }
      sisService.processWebhook.mockResolvedValue(mockResult)

      const dto = {
        event: 'grade.recorded' as const,
        studentId: '6501234',
        courseId: 'CS101',
        grade: 'A',
        semester: '1',
        academicYear: '2567',
        recordedAt: '2026-02-23T10:00:00Z',
        recordedBy: 'prof-001',
      }

      await controller.handleWebhook(dto)

      expect(sisService.processWebhook).toHaveBeenCalledWith(dto)
    })
  })
})
