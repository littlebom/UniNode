import {
  INestApplication,
  Controller,
  Get,
  Param,
} from '@nestjs/common'
import request from 'supertest'
import { createTestApp } from '../helpers/test-app'
import { TOKENS } from '../helpers/auth.helper'
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

@Controller('test-exposure')
class DataExposureController {
  @Get('db-error')
  throwDbError(): never {
    throw new Error(
      'connect ECONNREFUSED 127.0.0.1:5432 - PostgreSQL connection failed at /var/lib/postgresql/16/main',
    )
  }

  @Get('vault-error')
  throwVaultError(): never {
    throw new Error(
      'Vault transit sign failed: VAULT_TOKEN=hvs.CAESIgw4k... address=http://vault.internal:8200/v1/transit/sign/tu-ac-th',
    )
  }

  @Get('stack-trace')
  throwStackTrace(): never {
    const err = new Error('Signing operation failed')
    err.stack =
      'Error: Signing operation failed\n    at VcService.issue (/app/apps/uni-node/src/vc/vc.service.ts:87:11)\n    at CryptoUtil.sign (/app/packages/crypto/src/ed25519.ts:23:5)'
    throw err
  }

  @Get('env-leak')
  throwEnvLeak(): never {
    throw new Error(
      `Config error: VAULT_URL=http://vault.internal:8200, VAULT_TOKEN=hvs.secret123, DATABASE_URL=postgresql://node:pass@db:5432/uni_node`,
    )
  }

  @Get('admin-vc-data')
  @Roles('node_admin')
  getAdminVcData(): Record<string, unknown> {
    return {
      totalVcs: 150,
      revokedCount: 3,
      signingKeyId: 'tu-ac-th',
    }
  }

  @Get('null-error')
  throwNullError(): never {
    const obj: unknown = null
    return (obj as { sign: () => never }).sign()
  }
}

@Controller('test-public-exposure')
class PublicExposureController {
  @Get('health')
  @Public()
  getHealth(): { status: string } {
    return { status: 'ok' }
  }

  @Get('error')
  @Public()
  throwPublicError(): never {
    throw new Error(
      'Service unavailable: Redis at redis://cache.internal:6379 connection timeout',
    )
  }
}

describe('Node: Data Exposure Security Tests', () => {
  let app: INestApplication

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [DataExposureController, PublicExposureController],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  // ─── Response Sanitization ─────────────────────────────

  describe('Response Sanitization (500 Errors)', () => {
    it('should NOT expose database connection details', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-exposure/db-error')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)

      const body = JSON.stringify(res.body)
      expect(body).not.toContain('ECONNREFUSED')
      expect(body).not.toContain('127.0.0.1:5432')
      expect(body).not.toContain('postgresql')
      expect(body).not.toContain('/var/lib')
      expect(res.body.error.message).toBe('An unexpected error occurred')
    })

    it('should NOT expose Vault secrets or internal addresses', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-exposure/vault-error')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)

      const body = JSON.stringify(res.body)
      expect(body).not.toContain('VAULT_TOKEN')
      expect(body).not.toContain('hvs.')
      expect(body).not.toContain('vault.internal')
      expect(body).not.toContain('transit/sign')
    })

    it('should NOT expose stack traces with file paths', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-exposure/stack-trace')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)

      expect(res.body.error.stack).toBeUndefined()
      expect(res.body.stack).toBeUndefined()
      const body = JSON.stringify(res.body)
      expect(body).not.toContain('/app/')
      expect(body).not.toContain('.ts:')
      expect(body).not.toContain('vc.service')
      expect(body).not.toContain('ed25519')
    })

    it('should NOT expose environment variables in error response', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-exposure/env-leak')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)

      const body = JSON.stringify(res.body)
      expect(body).not.toContain('VAULT_URL')
      expect(body).not.toContain('VAULT_TOKEN')
      expect(body).not.toContain('DATABASE_URL')
      expect(body).not.toContain('hvs.secret123')
      expect(body).not.toContain('node:pass')
    })

    it('should NOT expose TypeError details', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-exposure/null-error')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)

      const body = JSON.stringify(res.body)
      expect(body).not.toContain('TypeError')
      expect(body).not.toContain('Cannot read')
      expect(body).not.toContain('.sign')
      expect(res.body.error.message).toBe('An unexpected error occurred')
    })

    it('should sanitize errors on public endpoints too', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-public-exposure/error')
        .expect(500)

      const body = JSON.stringify(res.body)
      expect(body).not.toContain('redis://')
      expect(body).not.toContain('cache.internal')
      expect(body).not.toContain('connection timeout')
      expect(res.body.error.message).toBe('An unexpected error occurred')
    })
  })

  // ─── PII Protection ────────────────────────────────────

  describe('PII Protection', () => {
    it('should not allow unauthenticated access to VC data', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-exposure/admin-vc-data')
        .expect(401)
    })

    it('should not allow student to access admin VC statistics', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/test-exposure/admin-vc-data')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .expect(403)
    })

    it('should allow node_admin to access admin VC data', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-exposure/admin-vc-data')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.totalVcs).toBeDefined()
    })
  })

  // ─── Error Format Consistency ──────────────────────────

  describe('Error Format Consistency', () => {
    it('should return consistent error format for all 500 errors', async () => {
      const endpoints = [
        '/unilink/api/v1/test-exposure/db-error',
        '/unilink/api/v1/test-exposure/vault-error',
        '/unilink/api/v1/test-exposure/stack-trace',
        '/unilink/api/v1/test-exposure/null-error',
      ]

      for (const endpoint of endpoints) {
        const res = await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${TOKENS.admin}`)
          .expect(500)

        expect(res.body.success).toBe(false)
        expect(res.body.error).toBeDefined()
        expect(res.body.error.code).toBe('INTERNAL_ERROR')
        expect(res.body.error.message).toBe('An unexpected error occurred')
        expect(res.body.error.traceId).toBeDefined()
        expect(res.body.timestamp).toBeDefined()
        expect(res.body.error.details).toBeUndefined()
      }
    })

    it('should include traceId for error correlation', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-exposure/db-error')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)

      expect(res.body.error.traceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
    })
  })
})
