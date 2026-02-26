import { INestApplication, Controller, Get, HttpException, HttpStatus } from '@nestjs/common'
import request from 'supertest'
import { UniLinkException, UniLinkErrorCode } from '@unilink/dto'
import { createTestApp } from '../helpers/test-app'
import { TOKENS } from '../helpers/auth.helper'

// Mock packages to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

// ─── Test Controllers ───────────────────────────────────

@Controller('test-error')
class ErrorTestController {
  @Get('unilink-exception')
  throwUniLinkException(): never {
    throw new UniLinkException(
      UniLinkErrorCode.VC_NOT_FOUND,
      404,
      'VC not found',
      'ไม่พบ VC',
    )
  }

  @Get('http-exception')
  throwHttpException(): never {
    throw new HttpException('Resource not found', HttpStatus.NOT_FOUND)
  }

  @Get('unhandled-exception')
  throwUnhandledException(): never {
    throw new Error('Internal database connection failed at /var/lib/postgresql/data')
  }

  @Get('type-error')
  throwTypeError(): never {
    // Simulate an unhandled TypeError
    const obj: unknown = null
    return (obj as { method: () => never }).method()
  }
}

describe('Error Handling Security Tests', () => {
  let app: INestApplication

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ErrorTestController],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  // ─── Error Response Format ────────────────────────────

  describe('Error Response Format', () => {
    it('should return standard error format for UniLinkException', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-error/unilink-exception')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(404)

      expect(res.body.success).toBe(false)
      expect(res.body.error).toBeDefined()
      expect(res.body.error.code).toBe(UniLinkErrorCode.VC_NOT_FOUND)
      expect(res.body.error.message).toBe('VC not found')
      expect(res.body.error.messageTH).toBe('ไม่พบ VC')
      expect(res.body.error.traceId).toBeDefined()
      expect(res.body.timestamp).toBeDefined()
    })

    it('should return standard error format for HttpException', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-error/http-exception')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(404)

      expect(res.body.success).toBe(false)
      expect(res.body.error).toBeDefined()
      expect(res.body.error.traceId).toBeDefined()
      expect(res.body.timestamp).toBeDefined()
    })

    it('should return 500 for unhandled exceptions', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-error/unhandled-exception')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)

      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('INTERNAL_ERROR')
      expect(res.body.error.traceId).toBeDefined()
    })
  })

  // ─── Error Information Leakage Prevention ─────────────

  describe('Error Information Leakage Prevention', () => {
    it('should NOT expose internal file paths in 500 errors', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-error/unhandled-exception')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)

      const body = JSON.stringify(res.body)
      // Should not expose internal paths
      expect(body).not.toContain('/var/lib')
      expect(body).not.toContain('postgresql')
      expect(body).not.toContain('database connection failed')
    })

    it('should NOT expose stack traces in error responses', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-error/unhandled-exception')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)

      expect(res.body.error.stack).toBeUndefined()
      expect(res.body.stack).toBeUndefined()
      // The error message should be generic
      expect(res.body.error.message).toBe('An unexpected error occurred')
    })

    it('should NOT expose database details in error responses', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-error/type-error')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)

      const body = JSON.stringify(res.body)
      expect(body).not.toContain('TypeError')
      expect(body).not.toContain('.method')
      expect(res.body.error.message).toBe('An unexpected error occurred')
      // Details should NOT be included for 500 errors
      expect(res.body.error.details).toBeUndefined()
    })

    it('should include traceId for error correlation', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-error/unhandled-exception')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(500)

      expect(res.body.error.traceId).toBeDefined()
      // traceId should be a UUID-like string
      expect(res.body.error.traceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
    })

    it('should expose details for non-500 UniLinkExceptions', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-error/unilink-exception')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(404)

      // For 4xx errors, detailed info is acceptable
      expect(res.body.error.message).toBe('VC not found')
      expect(res.body.error.messageTH).toBe('ไม่พบ VC')
    })
  })

  // ─── 404 Handling ─────────────────────────────────────

  describe('404 Handling', () => {
    it('should return standard error for unknown routes', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/nonexistent-endpoint')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(404)

      expect(res.body).toBeDefined()
    })
  })
})
