import {
  INestApplication,
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common'
import request from 'supertest'
import { createTestApp } from '../helpers/test-app'
import {
  TOKENS,
  generateTestJwt,
  generateExpiredJwt,
  generateInvalidJwt,
} from '../helpers/auth.helper'
import { Roles } from '../../src/auth/decorators/roles.decorator'
import { Public } from '../../src/auth/decorators/public.decorator'
import { SisWebhookGuard } from '../../src/sis/guards/sis-webhook.guard'

// Mock packages to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

// Set webhook secret for SisWebhookGuard tests (ConfigService reads process.env)
process.env.SIS_WEBHOOK_SECRET = 'test-webhook-secret-value'

// ─── Test Controllers ───────────────────────────────────

@Controller('test-authz-vc')
class VcAuthzController {
  @Post('issue')
  @Roles('node_admin')
  issueVc(@Body() body: { studentDid: string }): { vcId: string } {
    return { vcId: 'vc-test-001' }
  }

  @Get(':vcId')
  getVc(@Param('vcId') vcId: string): { vcId: string; status: string } {
    return { vcId, status: 'issued' }
  }

  @Delete(':vcId/revoke')
  @Roles('node_admin')
  revokeVc(@Param('vcId') vcId: string): { vcId: string; status: string } {
    return { vcId, status: 'revoked' }
  }
}

@Controller('test-authz-transfer')
class TransferAuthzController {
  @Post('request')
  @Roles('node_admin')
  createTransfer(
    @Body() body: { studentDid: string },
  ): { transferId: string; status: string } {
    return { transferId: 'tr-test-001', status: 'pending' }
  }

  @Put(':transferId/approve')
  @Roles('node_admin')
  approveTransfer(
    @Param('transferId') transferId: string,
  ): { transferId: string; status: string } {
    return { transferId, status: 'approved' }
  }

  @Get(':transferId')
  @Roles('node_admin', 'registrar')
  getTransfer(
    @Param('transferId') transferId: string,
  ): { transferId: string; status: string } {
    return { transferId, status: 'pending' }
  }
}

@Controller('test-authz-webhook')
class WebhookAuthzController {
  @Post('sis')
  @Public() // Webhooks bypass JWT auth, use SisWebhookGuard instead
  @UseGuards(SisWebhookGuard)
  handleWebhook(@Body() body: { event: string }): { received: boolean } {
    return { received: true }
  }
}

describe('Node: Authorization Boundary Security Tests', () => {
  let app: INestApplication

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [
        VcAuthzController,
        TransferAuthzController,
        WebhookAuthzController,
      ],
      providers: [SisWebhookGuard],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  // ─── Privilege Escalation Prevention ───────────────────

  describe('Privilege Escalation Prevention', () => {
    it('should deny student from issuing VCs (node_admin only)', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/test-authz-vc/issue')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send({ studentDid: 'did:web:tu.ac.th:students:6401001' })
        .expect(403)
    })

    it('should deny registrar from issuing VCs (node_admin only)', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/test-authz-vc/issue')
        .set('Authorization', `Bearer ${TOKENS.registrar}`)
        .send({ studentDid: 'did:web:tu.ac.th:students:6401001' })
        .expect(403)
    })

    it('should allow node_admin to issue VCs', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/test-authz-vc/issue')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({ studentDid: 'did:web:tu.ac.th:students:6401001' })
        .expect(201)

      expect(res.body.vcId).toBeDefined()
    })

    it('should deny student from revoking VCs', async () => {
      await request(app.getHttpServer())
        .delete('/unilink/api/v1/test-authz-vc/vc-test-001/revoke')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .expect(403)
    })

    it('should deny student from creating transfer requests', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/test-authz-transfer/request')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send({ studentDid: 'did:web:tu.ac.th:students:6401001' })
        .expect(403)
    })

    it('should deny student from approving transfers', async () => {
      await request(app.getHttpServer())
        .put('/unilink/api/v1/test-authz-transfer/tr-test-001/approve')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .expect(403)
    })

    it('should allow node_admin to approve transfers', async () => {
      const res = await request(app.getHttpServer())
        .put('/unilink/api/v1/test-authz-transfer/tr-test-001/approve')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.status).toBe('approved')
    })

    it('should deny student from viewing transfers (node_admin/registrar only)', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-authz-transfer/tr-test-001')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .expect(403)
    })

    it('should allow registrar to view transfers', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-authz-transfer/tr-test-001')
        .set('Authorization', `Bearer ${TOKENS.registrar}`)
        .expect(200)
    })
  })

  // ─── Token Manipulation ────────────────────────────────

  describe('Token Manipulation', () => {
    it('should reject expired tokens with 401', async () => {
      const expired = generateExpiredJwt({ role: 'node_admin' })

      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-authz-vc/vc-test-001')
        .set('Authorization', `Bearer ${expired}`)
        .expect(401)
    })

    it('should reject tokens signed with wrong secret', async () => {
      const wrongSecret = generateInvalidJwt({ role: 'node_admin' })

      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-authz-vc/vc-test-001')
        .set('Authorization', `Bearer ${wrongSecret}`)
        .expect(401)
    })

    it('should reject JWT with fabricated node_admin role signed with wrong secret', async () => {
      const fakeAdmin = generateInvalidJwt({ role: 'node_admin' })

      await request(app.getHttpServer())
        .post('/unilink/api/v1/test-authz-vc/issue')
        .set('Authorization', `Bearer ${fakeAdmin}`)
        .send({ studentDid: 'did:web:tu.ac.th:students:6401001' })
        .expect(401)
    })

    it('should reject JWT with invented role value', async () => {
      const inventedRole = generateTestJwt({ role: 'system_admin' })

      await request(app.getHttpServer())
        .post('/unilink/api/v1/test-authz-vc/issue')
        .set('Authorization', `Bearer ${inventedRole}`)
        .expect(403)
    })

    it('should reject "none" algorithm attack', async () => {
      const noneHeader = Buffer.from(
        JSON.stringify({ alg: 'none', typ: 'JWT' }),
      ).toString('base64url')
      const payload = Buffer.from(
        JSON.stringify({ sub: 'admin', role: 'node_admin' }),
      ).toString('base64url')
      const noneToken = `${noneHeader}.${payload}.`

      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-authz-vc/vc-test-001')
        .set('Authorization', `Bearer ${noneToken}`)
        .expect(401)
    })

    it('should reject manually crafted Base64 token', async () => {
      const fakePayload = Buffer.from(
        JSON.stringify({
          sub: 'admin',
          role: 'node_admin',
          exp: 9999999999,
        }),
      ).toString('base64url')
      const fakeHeader = Buffer.from(
        JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
      ).toString('base64url')
      const fakeToken = `${fakeHeader}.${fakePayload}.invalid-signature`

      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-authz-vc/vc-test-001')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401)
    })
  })

  // ─── SIS Webhook Security (Timing-Safe) ────────────────

  describe('SIS Webhook Security', () => {
    it('should reject webhook with wrong secret', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/test-authz-webhook/sis')
        .set('x-webhook-secret', 'wrong-secret-value')
        .send({ event: 'grade.updated' })
        .expect(401)

      expect(res.body.success).toBe(false)
    })

    it('should reject webhook with missing secret header', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/test-authz-webhook/sis')
        .send({ event: 'grade.updated' })
        .expect(401)

      expect(res.body.success).toBe(false)
    })

    it('should reject webhook with empty secret', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/test-authz-webhook/sis')
        .set('x-webhook-secret', '')
        .send({ event: 'grade.updated' })
        .expect(401)

      expect(res.body.success).toBe(false)
    })

    it('should accept webhook with correct secret', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/test-authz-webhook/sis')
        .set('x-webhook-secret', 'test-webhook-secret-value')
        .send({ event: 'grade.updated' })
        .expect(201)

      expect(res.body.received).toBe(true)
    })

    it('should reject webhook with secret that differs by one character', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/test-authz-webhook/sis')
        .set('x-webhook-secret', 'test-webhook-secret-valuf')
        .send({ event: 'grade.updated' })
        .expect(401)
    })
  })

  // ─── Unauthenticated Access ────────────────────────────

  describe('Unauthenticated Access', () => {
    it('should reject all protected endpoints without token', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-authz-vc/vc-test-001')
        .expect(401)

      await request(app.getHttpServer())
        .post('/unilink/api/v1/test-authz-vc/issue')
        .send({ studentDid: 'did:web:tu.ac.th:students:6401001' })
        .expect(401)

      await request(app.getHttpServer())
        .post('/unilink/api/v1/test-authz-transfer/request')
        .send({ studentDid: 'did:web:tu.ac.th:students:6401001' })
        .expect(401)
    })
  })
})
