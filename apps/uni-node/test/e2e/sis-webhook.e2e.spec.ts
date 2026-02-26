import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { SisController } from '../../src/sis/sis.controller'
import { SisService } from '../../src/sis/sis.service'
import { SisWebhookGuard } from '../../src/sis/guards/sis-webhook.guard'
import { createTestApp } from '../helpers/test-app'

jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

describe('SIS Webhook E2E', () => {
  let app: INestApplication

  const mockSisService = {
    processWebhook: jest.fn(),
  }

  beforeAll(async () => {
    // Set webhook secret for testing
    process.env['SIS_WEBHOOK_SECRET'] = 'test-webhook-secret-123'

    const result = await createTestApp({
      controllers: [SisController],
      providers: [
        { provide: SisService, useValue: mockSisService },
        SisWebhookGuard,
      ],
    })
    app = result.app
  })

  afterAll(async () => {
    delete process.env['SIS_WEBHOOK_SECRET']
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const VALID_WEBHOOK = {
    event: 'grade.recorded',
    studentId: '6401001',
    courseId: 'CS101',
    grade: 'A',
    semester: '1',
    academicYear: '2569',
    recordedAt: '2026-02-25T10:00:00Z',
  }

  // ── POST /unilink/api/v1/sis/webhook ──

  describe('POST /unilink/api/v1/sis/webhook', () => {
    it('should accept webhook with valid secret', async () => {
      mockSisService.processWebhook.mockResolvedValue({
        received: true,
        event: 'grade.recorded',
        vcId: 'vc-cs101-6401001-2569-1',
      })

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/sis/webhook')
        .set('X-Webhook-Secret', 'test-webhook-secret-123')
        .send(VALID_WEBHOOK)
        .expect(200)

      expect(res.body.received).toBe(true)
      expect(mockSisService.processWebhook).toHaveBeenCalled()
    })

    it('should reject webhook with missing secret', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/sis/webhook')
        .send(VALID_WEBHOOK)
        .expect(401)
    })

    it('should reject webhook with wrong secret', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/sis/webhook')
        .set('X-Webhook-Secret', 'wrong-secret')
        .send(VALID_WEBHOOK)
        .expect(401)
    })
  })
})
