import { INestApplication, Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common'
import request from 'supertest'
import { createTestApp } from '../../helpers/test-app'
import { TOKENS, generateTestJwt } from '../../helpers/auth.helper'
import { Roles } from '../../../src/auth/decorators/roles.decorator'

jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

// ── Mock Consent Controller (simulates Registry behavior) ─

interface ConsentRecord {
  id: string
  studentDid: string
  requesterNode: string
  status: string
  token: string | null
  dataScope: { vcs: string[]; courses: string[] }
}

const mockConsentStore: Map<string, ConsentRecord> = new Map()

@Controller('consent-sim')
class ConsentSimController {
  @Post('request')
  @Roles('node_admin')
  createConsentRequest(
    @Body() body: { studentDid: string; dataScope: { vcs: string[]; courses: string[] } },
  ): { success: boolean; data: ConsentRecord } {
    const consent: ConsentRecord = {
      id: 'consent-001',
      studentDid: body.studentDid,
      requesterNode: 'cu.ac.th',
      status: 'pending',
      token: null,
      dataScope: body.dataScope,
    }
    mockConsentStore.set(consent.id, consent)
    return { success: true, data: consent }
  }

  @Post(':id/approve')
  approveConsent(
    @Param('id') id: string,
  ): { success: boolean; data: ConsentRecord } {
    const consent = mockConsentStore.get(id)
    if (!consent) {
      return { success: false, data: {} as ConsentRecord }
    }
    consent.status = 'approved'
    consent.token = 'consent-access-token-abc123'
    mockConsentStore.set(id, consent)
    return { success: true, data: consent }
  }

  @Post(':id/revoke')
  revokeConsent(
    @Param('id') id: string,
  ): { success: boolean; data: ConsentRecord } {
    const consent = mockConsentStore.get(id)
    if (!consent) {
      return { success: false, data: {} as ConsentRecord }
    }
    consent.status = 'revoked'
    consent.token = null
    mockConsentStore.set(id, consent)
    return { success: true, data: consent }
  }

  @Get(':id')
  getConsent(
    @Param('id') id: string,
  ): { success: boolean; data: ConsentRecord | null } {
    const consent = mockConsentStore.get(id) ?? null
    return { success: true, data: consent }
  }
}

// ── Mock Data Access Controller (simulates Node data access) ─

@Controller('data-sim')
class DataAccessSimController {
  @Get('student/:did')
  @Roles('node_admin')
  getStudentData(
    @Param('did') did: string,
  ): { success: boolean; data: { did: string; courses: string[] } } {
    return {
      success: true,
      data: {
        did,
        courses: ['CS101', 'MATH101'],
      },
    }
  }
}

describe('Cross-Service: Consent & Data Access Flow E2E', () => {
  let app: INestApplication

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ConsentSimController, DataAccessSimController],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    mockConsentStore.clear()
  })

  // ── Full Consent → Data Access → Revoke Flow ──────────

  describe('Consent → Data Access → Revoke Flow', () => {
    it('Step 1: Request consent for student data', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/consent-sim/request')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          studentDid: 'did:web:tu.ac.th:students:6401001',
          dataScope: {
            vcs: ['vc-cs101-6401001-2569-1'],
            courses: ['CS101'],
          },
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.id).toBe('consent-001')
      expect(res.body.data.status).toBe('pending')
      expect(res.body.data.token).toBeNull()
    })

    it('Step 2: Student approves consent', async () => {
      // Create consent first
      await request(app.getHttpServer())
        .post('/unilink/api/v1/consent-sim/request')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          studentDid: 'did:web:tu.ac.th:students:6401001',
          dataScope: {
            vcs: ['vc-cs101-6401001-2569-1'],
            courses: ['CS101'],
          },
        })

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/consent-sim/consent-001/approve')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('approved')
      expect(res.body.data.token).toBe('consent-access-token-abc123')
    })

    it('Step 3: Access data with approved consent', async () => {
      const res = await request(app.getHttpServer())
        .get(
          '/unilink/api/v1/data-sim/student/did:web:tu.ac.th:students:6401001',
        )
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.did).toBe('did:web:tu.ac.th:students:6401001')
      expect(res.body.data.courses).toContain('CS101')
    })

    it('Step 4: Student revokes consent', async () => {
      // Setup: create and approve consent
      await request(app.getHttpServer())
        .post('/unilink/api/v1/consent-sim/request')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          studentDid: 'did:web:tu.ac.th:students:6401001',
          dataScope: {
            vcs: ['vc-cs101-6401001-2569-1'],
            courses: ['CS101'],
          },
        })

      await request(app.getHttpServer())
        .post('/unilink/api/v1/consent-sim/consent-001/approve')
        .set('Authorization', `Bearer ${TOKENS.admin}`)

      // Revoke
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/consent-sim/consent-001/revoke')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('revoked')
      expect(res.body.data.token).toBeNull()
    })

    it('Step 5: Verify consent is revoked', async () => {
      // Setup: create, approve, then revoke
      await request(app.getHttpServer())
        .post('/unilink/api/v1/consent-sim/request')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          studentDid: 'did:web:tu.ac.th:students:6401001',
          dataScope: {
            vcs: ['vc-cs101-6401001-2569-1'],
            courses: ['CS101'],
          },
        })

      await request(app.getHttpServer())
        .post('/unilink/api/v1/consent-sim/consent-001/approve')
        .set('Authorization', `Bearer ${TOKENS.admin}`)

      await request(app.getHttpServer())
        .post('/unilink/api/v1/consent-sim/consent-001/revoke')
        .set('Authorization', `Bearer ${TOKENS.admin}`)

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/consent-sim/consent-001')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.data.status).toBe('revoked')
      expect(res.body.data.token).toBeNull()
    })
  })

  // ── Authorization Checks ───────────────────────────────

  describe('Authorization Checks', () => {
    it('unauthenticated user cannot request consent', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/consent-sim/request')
        .send({
          studentDid: 'did:web:tu.ac.th:students:6401001',
          dataScope: { vcs: [], courses: [] },
        })
        .expect(401)
    })

    it('student cannot access other student data', async () => {
      await request(app.getHttpServer())
        .get(
          '/unilink/api/v1/data-sim/student/did:web:tu.ac.th:students:6401001',
        )
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .expect(403)
    })

    it('admin can access student data with proper auth', async () => {
      const res = await request(app.getHttpServer())
        .get(
          '/unilink/api/v1/data-sim/student/did:web:tu.ac.th:students:6401001',
        )
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
    })
  })
})
