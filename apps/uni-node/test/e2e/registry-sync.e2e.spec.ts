import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { RegistrySyncController } from '../../src/registry-sync/registry-sync.controller'
import { RegistrySyncService } from '../../src/registry-sync/registry-sync.service'
import { createTestApp } from '../helpers/test-app'
import { TOKENS } from '../helpers/auth.helper'

jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

describe('Registry Sync E2E', () => {
  let app: INestApplication

  const mockSyncService = {
    triggerManualSync: jest.fn(),
    getSyncHistory: jest.fn(),
    getLastSync: jest.fn(),
    getCurrentAcademicPeriod: jest.fn(),
  }

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [RegistrySyncController],
      providers: [{ provide: RegistrySyncService, useValue: mockSyncService }],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── POST /unilink/api/v1/registry-sync/trigger ──

  describe('POST /unilink/api/v1/registry-sync/trigger', () => {
    it('should trigger manual sync (admin)', async () => {
      mockSyncService.triggerManualSync.mockResolvedValue({
        syncLogId: 'sync-log-001',
        academicYear: '2569',
        semester: '1',
      })

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/registry-sync/trigger')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({})
        .expect(202)

      expect(res.body.success).toBe(true)
      expect(res.body.data.syncLogId).toBe('sync-log-001')
    })

    it('should return 403 for student', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/registry-sync/trigger')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send({})
        .expect(403)
    })

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/registry-sync/trigger')
        .send({})
        .expect(401)
    })
  })

  // ── GET /unilink/api/v1/registry-sync/history ──

  describe('GET /unilink/api/v1/registry-sync/history', () => {
    it('should return sync history', async () => {
      mockSyncService.getSyncHistory.mockResolvedValue({
        data: [
          {
            id: 'sync-1',
            timestamp: '2026-02-24T02:00:00Z',
            status: 'success',
            coursesCount: 15,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      })

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/registry-sync/history')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.data).toHaveLength(1)
    })
  })

  // ── GET /unilink/api/v1/registry-sync/status ──

  describe('GET /unilink/api/v1/registry-sync/status', () => {
    it('should return sync status', async () => {
      mockSyncService.getLastSync.mockResolvedValue({
        lastSync: new Date('2026-02-24T02:00:00Z'),
        academicYear: '2569',
        semester: '1',
        courseCount: 15,
      })
      mockSyncService.getCurrentAcademicPeriod.mockReturnValue({
        academicYear: '2569',
        semester: '2',
      })

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/registry-sync/status')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.currentPeriod).toBeDefined()
    })
  })
})
