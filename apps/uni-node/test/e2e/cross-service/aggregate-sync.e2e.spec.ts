import { INestApplication, Controller, Post, Get, Body } from '@nestjs/common'
import request from 'supertest'
import { createTestApp } from '../../helpers/test-app'
import { TOKENS } from '../../helpers/auth.helper'
import { Roles } from '../../../src/auth/decorators/roles.decorator'

jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

// ── Mock Aggregate Sync Controller ──────────────────────

interface SyncLog {
  id: string
  status: string
  sentAt: string
  coursesCount: number
}

const mockSyncLogs: SyncLog[] = []
let mockSyncStatus = { lastSync: null as string | null, enabled: true }

@Controller('registry-sync-sim')
class RegistrySyncSimController {
  @Post('trigger')
  @Roles('node_admin')
  triggerSync(): {
    success: boolean
    data: { syncId: string; status: string; coursesCount: number }
  } {
    const syncId = `sync-${Date.now()}`
    const log: SyncLog = {
      id: syncId,
      status: 'completed',
      sentAt: new Date().toISOString(),
      coursesCount: 2,
    }
    mockSyncLogs.push(log)
    mockSyncStatus.lastSync = log.sentAt
    return {
      success: true,
      data: {
        syncId,
        status: 'completed',
        coursesCount: 2,
      },
    }
  }

  @Get('history')
  @Roles('node_admin')
  getHistory(): { success: boolean; data: SyncLog[] } {
    return { success: true, data: mockSyncLogs }
  }

  @Get('status')
  @Roles('node_admin')
  getStatus(): {
    success: boolean
    data: { lastSync: string | null; enabled: boolean }
  } {
    return { success: true, data: mockSyncStatus }
  }
}

// ── Mock Aggregate Submit Controller (simulates Registry) ─

@Controller('aggregate-sim')
class AggregateSimController {
  @Post()
  @Roles('node_admin')
  submitAggregate(
    @Body()
    body: {
      academicYear: string
      semester: string
      courses: { courseId: string; enrolledCount: number }[]
    },
  ): {
    success: boolean
    data: { received: number; academicYear: string; semester: string }
  } {
    return {
      success: true,
      data: {
        received: body.courses.length,
        academicYear: body.academicYear,
        semester: body.semester,
      },
    }
  }
}

describe('Cross-Service: Aggregate Sync Flow E2E', () => {
  let app: INestApplication

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [RegistrySyncSimController, AggregateSimController],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    mockSyncLogs.length = 0
    mockSyncStatus = { lastSync: null, enabled: true }
  })

  // ── Full Aggregate Sync Flow ───────────────────────────

  describe('Full Aggregate Sync Flow', () => {
    it('Step 1: Check sync status before trigger', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/registry-sync-sim/status')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.lastSync).toBeNull()
      expect(res.body.data.enabled).toBe(true)
    })

    it('Step 2: Trigger aggregate sync', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/registry-sync-sim/trigger')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.syncId).toBeDefined()
      expect(res.body.data.status).toBe('completed')
      expect(res.body.data.coursesCount).toBe(2)
    })

    it('Step 3: Verify sync history after trigger', async () => {
      // Trigger first
      await request(app.getHttpServer())
        .post('/unilink/api/v1/registry-sync-sim/trigger')
        .set('Authorization', `Bearer ${TOKENS.admin}`)

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/registry-sync-sim/history')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].status).toBe('completed')
    })

    it('Step 4: Submit aggregate data to registry', async () => {
      const aggregateData = {
        academicYear: '2569',
        semester: '1',
        courses: [
          {
            courseId: 'CS101',
            enrolledCount: 120,
            passedCount: 108,
            passRate: 90.0,
            avgGradePoint: 3.2,
          },
          {
            courseId: 'MATH101',
            enrolledCount: 150,
            passedCount: 130,
            passRate: 86.7,
            avgGradePoint: 2.9,
          },
        ],
      }

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/aggregate-sim')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(aggregateData)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.received).toBe(2)
      expect(res.body.data.academicYear).toBe('2569')
      expect(res.body.data.semester).toBe('1')
    })

    it('Step 5: Check sync status after completion', async () => {
      // Trigger first
      await request(app.getHttpServer())
        .post('/unilink/api/v1/registry-sync-sim/trigger')
        .set('Authorization', `Bearer ${TOKENS.admin}`)

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/registry-sync-sim/status')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.lastSync).toBeDefined()
      expect(res.body.data.lastSync).not.toBeNull()
    })
  })

  // ── Authorization ──────────────────────────────────────

  describe('Authorization', () => {
    it('student should not trigger sync', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/registry-sync-sim/trigger')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .expect(403)
    })

    it('unauthenticated user should not trigger sync', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/registry-sync-sim/trigger')
        .expect(401)
    })

    it('student should not view sync history', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/registry-sync-sim/history')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .expect(403)
    })

    it('student should not submit aggregate data', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/aggregate-sim')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send({
          academicYear: '2569',
          semester: '1',
          courses: [],
        })
        .expect(403)
    })
  })
})
