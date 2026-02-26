import { INestApplication, Controller, Get, Delete } from '@nestjs/common'
import request from 'supertest'
import { createTestApp } from '../helpers/test-app'
import {
  TOKENS,
  generateTestJwt,
  TEST_JWT_SECRET,
} from '../helpers/auth.helper'
import { Roles } from '../../src/auth/decorators/roles.decorator'
import { Public } from '../../src/auth/decorators/public.decorator'

// Mock packages to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

// ─── Test Controllers ───────────────────────────────────

@Controller('test-protected')
class ProtectedController {
  @Get()
  getProtected(): { message: string } {
    return { message: 'protected resource' }
  }

  @Get('admin-only')
  @Roles('node_admin')
  getAdminOnly(): { message: string } {
    return { message: 'admin only resource' }
  }

  @Get('registrar-only')
  @Roles('node_admin', 'registrar')
  getRegistrarOnly(): { message: string } {
    return { message: 'registrar resource' }
  }

  @Delete('dangerous')
  @Roles('node_admin')
  deleteDangerous(): { message: string } {
    return { message: 'deleted' }
  }
}

@Controller('test-public')
class PublicController {
  @Get()
  @Public()
  getPublic(): { message: string } {
    return { message: 'public resource' }
  }
}

describe('Authentication & Authorization Security Tests', () => {
  let app: INestApplication

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ProtectedController, PublicController],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  // ─── JWT Validation ───────────────────────────────────

  describe('JWT Validation', () => {
    it('should reject requests without token with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-protected')
        .expect(401)

      expect(res.body.success).toBe(false)
    })

    it('should reject invalid JWT signature with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-protected')
        .set('Authorization', `Bearer ${TOKENS.invalid}`)
        .expect(401)

      expect(res.body.success).toBe(false)
    })

    it('should reject expired JWT with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-protected')
        .set('Authorization', `Bearer ${TOKENS.expired}`)
        .expect(401)

      expect(res.body.success).toBe(false)
    })

    it('should accept valid JWT and return 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-protected')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.message).toBe('protected resource')
    })

    it('should reject malformed Authorization header', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-protected')
        .set('Authorization', 'NotBearer sometoken')
        .expect(401)
    })

    it('should reject completely random string as token', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-protected')
        .set('Authorization', 'Bearer not-a-jwt-at-all')
        .expect(401)
    })
  })

  // ─── Role-Based Access Control ────────────────────────

  describe('Role-Based Access Control', () => {
    it('should grant node_admin full access to all endpoints', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-protected/admin-only')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-protected/registrar-only')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)
    })

    it('should grant registrar access to registrar endpoints', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-protected/registrar-only')
        .set('Authorization', `Bearer ${TOKENS.registrar}`)
        .expect(200)
    })

    it('should deny student access to admin endpoints with 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-protected/admin-only')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .expect(403)

      expect(res.body.success).toBe(false)
      expect(res.body.error).toBeDefined()
    })

    it('should deny user with no role to role-protected endpoints', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-protected/admin-only')
        .set('Authorization', `Bearer ${TOKENS.noRole}`)
        .expect(403)

      expect(res.body.success).toBe(false)
    })
  })

  // ─── Public Endpoints ─────────────────────────────────

  describe('Public Endpoints', () => {
    it('should allow access without token for @Public() routes', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-public')
        .expect(200)

      expect(res.body.message).toBe('public resource')
    })

    it('should allow access with invalid token for @Public() routes', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-public')
        .set('Authorization', 'Bearer garbage')
        .expect(200)

      expect(res.body.message).toBe('public resource')
    })

    it('should NOT allow public access to non-@Public() routes', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-protected')
        .expect(401)
    })
  })
})
