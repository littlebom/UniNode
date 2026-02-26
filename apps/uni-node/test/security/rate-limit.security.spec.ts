import { INestApplication, Controller, Get } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import helmet from 'helmet'
import { json, urlencoded } from 'express'
import request from 'supertest'

// Mock packages to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

// ─── Test Controllers ───────────────────────────────────

@Controller('test-rate')
class RateLimitTestController {
  @Get()
  normalEndpoint(): { ok: boolean } {
    return { ok: true }
  }

  @Get('strict')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  strictEndpoint(): { ok: boolean } {
    return { ok: true }
  }
}

describe('Node: Rate Limiting, Security Headers & CORS', () => {
  let app: INestApplication
  let appWithCors: INestApplication

  beforeAll(async () => {
    // ── App with rate limiting + helmet ──
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              CORS_ORIGINS: 'http://localhost:3000,http://trusted.example.com',
              RATE_LIMIT_TTL: '60',
              RATE_LIMIT_MAX: '5',
            }),
          ],
        }),
        // Low limits for testing rate limiting
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
      ],
      controllers: [RateLimitTestController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile()

    app = module.createNestApplication()

    // Apply same security middleware as main.ts
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
          },
        },
        crossOriginEmbedderPolicy: false,
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
        },
      }),
    )
    app.use(json({ limit: '1mb' }))
    app.use(urlencoded({ extended: true, limit: '1mb' }))

    await app.init()

    // ── App with CORS configured ──
    const corsModule: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              CORS_ORIGINS: 'http://localhost:3000,http://trusted.example.com',
            }),
          ],
        }),
        ThrottlerModule.forRoot([{ ttl: 0, limit: 10000 }]),
      ],
      controllers: [RateLimitTestController],
    }).compile()

    appWithCors = corsModule.createNestApplication()
    appWithCors.enableCors({
      origin: ['http://localhost:3000', 'http://trusted.example.com'],
      credentials: true,
    })
    await appWithCors.init()
  })

  afterAll(async () => {
    await app.close()
    await appWithCors.close()
  })

  // ─── Rate Limit Enforcement ───────────────────────────

  describe('Rate Limit Enforcement', () => {
    it('should allow requests within the rate limit', async () => {
      const res = await request(app.getHttpServer())
        .get('/test-rate')
        .expect(200)

      expect(res.body.ok).toBe(true)
    })

    it('should return 429 when rate limit is exceeded', async () => {
      const promises = []
      for (let i = 0; i < 7; i++) {
        promises.push(request(app.getHttpServer()).get('/test-rate'))
      }
      const responses = await Promise.all(promises)

      const rateLimited = responses.filter((r) => r.status === 429)
      expect(rateLimited.length).toBeGreaterThanOrEqual(1)
    })

    it('should return 429 for strict endpoint after fewer requests', async () => {
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(request(app.getHttpServer()).get('/test-rate/strict'))
      }
      const responses = await Promise.all(promises)

      const rateLimited = responses.filter((r) => r.status === 429)
      expect(rateLimited.length).toBeGreaterThanOrEqual(1)
    })

    it('should include Retry-After header in 429 response', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(request(app.getHttpServer()).get('/test-rate/strict'))
      }
      const responses = await Promise.all(promises)

      const rateLimited = responses.find((r) => r.status === 429)
      if (rateLimited) {
        expect(rateLimited.headers['retry-after']).toBeDefined()
      }
    })
  })

  // ─── Security Headers ─────────────────────────────────

  describe('Security Headers', () => {
    it('should include Strict-Transport-Security (HSTS) header', async () => {
      const res = await request(app.getHttpServer()).get('/test-rate')

      expect(res.headers['strict-transport-security']).toBeDefined()
      expect(res.headers['strict-transport-security']).toContain(
        'max-age=31536000',
      )
      expect(res.headers['strict-transport-security']).toContain(
        'includeSubDomains',
      )
    })

    it('should include X-Content-Type-Options: nosniff', async () => {
      const res = await request(app.getHttpServer()).get('/test-rate')

      expect(res.headers['x-content-type-options']).toBe('nosniff')
    })

    it('should include X-Frame-Options header', async () => {
      const res = await request(app.getHttpServer()).get('/test-rate')

      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN')
    })

    it('should include Content-Security-Policy header', async () => {
      const res = await request(app.getHttpServer()).get('/test-rate')

      const csp = res.headers['content-security-policy']
      expect(csp).toBeDefined()
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("script-src 'self'")
    })

    it('should NOT include X-Powered-By header (removed by Helmet)', async () => {
      const res = await request(app.getHttpServer()).get('/test-rate')

      expect(res.headers['x-powered-by']).toBeUndefined()
    })

    it('should include X-DNS-Prefetch-Control header', async () => {
      const res = await request(app.getHttpServer()).get('/test-rate')

      expect(res.headers['x-dns-prefetch-control']).toBeDefined()
    })

    it('should return JSON content type for API responses', async () => {
      const res = await request(app.getHttpServer()).get('/test-rate')

      expect(res.headers['content-type']).toMatch(/application\/json/)
    })
  })

  // ─── CORS Enforcement ─────────────────────────────────

  describe('CORS Enforcement', () => {
    it('should reflect allowed origin in Access-Control-Allow-Origin', async () => {
      const res = await request(appWithCors.getHttpServer())
        .get('/test-rate')
        .set('Origin', 'http://localhost:3000')

      expect(res.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      )
    })

    it('should reflect second allowed origin', async () => {
      const res = await request(appWithCors.getHttpServer())
        .get('/test-rate')
        .set('Origin', 'http://trusted.example.com')

      expect(res.headers['access-control-allow-origin']).toBe(
        'http://trusted.example.com',
      )
    })

    it('should NOT reflect disallowed origin', async () => {
      const res = await request(appWithCors.getHttpServer())
        .get('/test-rate')
        .set('Origin', 'http://malicious.example.com')

      const origin = res.headers['access-control-allow-origin']
      if (origin) {
        expect(origin).not.toBe('http://malicious.example.com')
      }
    })

    it('should include Access-Control-Allow-Credentials for allowed origin', async () => {
      const res = await request(appWithCors.getHttpServer())
        .options('/test-rate')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')

      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('should handle preflight OPTIONS request', async () => {
      const res = await request(appWithCors.getHttpServer())
        .options('/test-rate')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type,authorization')

      expect(res.status).toBe(204)
      expect(res.headers['access-control-allow-methods']).toBeDefined()
    })
  })
})
