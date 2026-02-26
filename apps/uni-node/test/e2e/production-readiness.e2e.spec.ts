import { Test } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { APP_GUARD } from '@nestjs/core'
import request from 'supertest'
import { json, urlencoded } from 'express'
import { MetricsController } from '../../src/metrics/metrics.controller'
import { MetricsService } from '../../src/metrics/metrics.service'
import { correlationIdMiddleware } from '../../src/common/middleware/correlation-id.middleware'
import { createRequestLoggerMiddleware } from '../../src/common/middleware/request-logger.middleware'
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter'
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard'
import { JwtStrategy } from '../../src/auth/jwt.strategy'
import { RolesGuard } from '../../src/auth/guards/roles.guard'
import { TEST_JWT_SECRET } from '../helpers/auth.helper'

jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

/**
 * Production Readiness E2E Tests for Node.
 *
 * Tests correlation ID propagation, Prometheus /metrics endpoint,
 * MetricsService counters, and auth boundary (@Public on /metrics).
 *
 * Builds the app manually so we can apply Express middleware BEFORE app.init().
 */
describe('Production Readiness E2E (Node)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            NODE_ENV: 'test',
            JWT_SECRET: TEST_JWT_SECRET,
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
            REDIS_URL: 'redis://localhost:6379',
            VAULT_URL: 'http://localhost:8200',
            VAULT_TOKEN: 'test-vault-token',
            NODE_ID: 'tu.ac.th',
            NODE_DOMAIN: 'tu.ac.th',
          })],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [MetricsController],
      providers: [
        MetricsService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        // Global guards (same as AppModule)
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile()

    app = module.createNestApplication()

    // Apply observability middleware BEFORE init (same order as main.ts)
    app.use(correlationIdMiddleware)
    app.use(createRequestLoggerMiddleware('Node-Test'))

    // Standard middleware
    app.use(json({ limit: '1mb' }))
    app.use(urlencoded({ extended: true, limit: '1mb' }))

    app.setGlobalPrefix('unilink/api/v1', {
      exclude: [
        '.well-known/did.json',
        '.well-known/status-list/:id',
        'health',
        'health/ready',
        'metrics',
      ],
    })

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    )
    app.useGlobalFilters(new GlobalExceptionFilter())

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  // ── Correlation ID ──

  describe('Correlation ID', () => {
    it('should generate X-Correlation-Id when not provided', async () => {
      // /metrics is @Public() so it works without JWT
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200)

      const correlationId = res.headers['x-correlation-id']
      expect(correlationId).toBeDefined()
      expect(typeof correlationId).toBe('string')
      expect(correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
    })

    it('should forward X-Correlation-Id when provided by client', async () => {
      const clientCorrelationId = 'node-test-correlation-99999'

      const res = await request(app.getHttpServer())
        .get('/metrics')
        .set('X-Correlation-Id', clientCorrelationId)
        .expect(200)

      expect(res.headers['x-correlation-id']).toBe(clientCorrelationId)
    })

    it('should return unique correlation IDs for different requests', async () => {
      const res1 = await request(app.getHttpServer()).get('/metrics')
      const res2 = await request(app.getHttpServer()).get('/metrics')

      const id1 = res1.headers['x-correlation-id']
      const id2 = res2.headers['x-correlation-id']

      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
    })
  })

  // ── Prometheus Metrics ──

  describe('Prometheus Metrics (/metrics)', () => {
    it('should return metrics in Prometheus text format', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200)

      expect(res.headers['content-type']).toContain('text/plain')
      expect(res.text).toContain('process_cpu_')
      expect(res.text).toContain('nodejs_')
    })

    it('should include custom UniLink Node counters', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200)

      expect(res.text).toContain('unilink_http_requests_total')
      expect(res.text).toContain('unilink_http_request_duration_seconds')
      expect(res.text).toContain('unilink_vc_issued_total')
      expect(res.text).toContain('unilink_transfer_requests_total')
      expect(res.text).toContain('unilink_vc_verified_total')
    })

    it('should include app label', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200)

      expect(res.text).toContain('app="uni-node"')
    })

    it('should not cache metrics responses', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200)

      expect(res.headers['cache-control']).toBe('no-store')
    })

    it('should be accessible without JWT (@Public endpoint)', async () => {
      // Node has global APP_GUARD JwtAuthGuard, but /metrics is @Public()
      const res = await request(app.getHttpServer())
        .get('/metrics')

      expect(res.status).toBe(200)
      expect(res.text).toContain('process_cpu_')
    })

    it('should be excluded from global API prefix', async () => {
      // /metrics should work at root
      await request(app.getHttpServer())
        .get('/metrics')
        .expect(200)

      // /unilink/api/v1/metrics should NOT work
      await request(app.getHttpServer())
        .get('/unilink/api/v1/metrics')
        .expect(404)
    })
  })

  // ── MetricsService Counter Increment ──

  describe('MetricsService', () => {
    it('should allow incrementing VC counters', async () => {
      const metricsService = app.get(MetricsService)

      metricsService.vcIssuedTotal.inc({ type: 'CourseCredential' })
      metricsService.vcVerifiedTotal.inc({ result: 'valid' })
      metricsService.transferRequestsTotal.inc({ status: 'approved' })
      metricsService.httpRequestsTotal.inc({
        method: 'POST',
        path: '/vc/issue',
        status: '201',
      })

      const res = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200)

      expect(res.text).toContain('unilink_vc_issued_total')
      expect(res.text).toContain('type="CourseCredential"')
      expect(res.text).toContain('unilink_vc_verified_total')
      expect(res.text).toContain('result="valid"')
      expect(res.text).toContain('unilink_transfer_requests_total')
      expect(res.text).toContain('status="approved"')
    })

    it('should track HTTP request duration histogram', async () => {
      const metricsService = app.get(MetricsService)

      metricsService.httpRequestDuration.observe(
        { method: 'GET', path: '/courses', status: '200' },
        0.15,
      )

      const res = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200)

      expect(res.text).toContain('unilink_http_request_duration_seconds_bucket')
      expect(res.text).toContain('le="0.25"')
    })
  })
})
