import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe, Provider, Type } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { APP_GUARD } from '@nestjs/core'
import { json, urlencoded } from 'express'

import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter'
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard'
import { JwtStrategy } from '../../src/auth/jwt.strategy'
import { RolesGuard } from '../../src/auth/guards/roles.guard'
import { TEST_JWT_SECRET } from './auth.helper'

/**
 * Test environment variables matching env.validation requirements.
 * Used to satisfy ConfigModule.validate() in integration tests.
 */
const TEST_ENV = {
  NODE_ENV: 'test',
  PORT: '3010',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: TEST_JWT_SECRET,
  VAULT_URL: 'http://localhost:8200',
  VAULT_TOKEN: 'test-vault-token',
  VAULT_SIGNING_KEY_PATH: 'test/signing-key',
  NODE_ID: 'tu.ac.th',
  NODE_DOMAIN: 'tu.ac.th',
  API_PREFIX: 'unilink/api/v1',
}

/**
 * Options for creating a test app
 */
export interface TestAppOptions {
  /** Additional controllers to include */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controllers?: Type<any>[]
  /** Additional providers (services, repositories) */
  providers?: Provider[]
  /** Import additional modules */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imports?: any[]
}

/**
 * Creates a NestJS test application with:
 * - Real JWT authentication (JwtAuthGuard + JwtStrategy)
 * - Real role-based access control (RolesGuard)
 * - Real validation pipes (class-validator)
 * - Real exception filter (GlobalExceptionFilter)
 * - Global prefix: unilink/api/v1
 *
 * External dependencies (DB, Redis, Vault) are NOT included —
 * provide mock services/repositories via options.providers.
 */
export async function createTestApp(
  options: TestAppOptions,
): Promise<{ app: INestApplication; module: TestingModule }> {
  const moduleBuilder = Test.createTestingModule({
    imports: [
      // Config with test env
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => TEST_ENV],
      }),

      // Passport + JWT with test secret
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.register({
        secret: TEST_JWT_SECRET,
        signOptions: { expiresIn: '1h' },
      }),

      // Additional module imports
      ...(options.imports ?? []),
    ],
    controllers: options.controllers ?? [],
    providers: [
      // Auth infrastructure
      JwtStrategy,
      JwtAuthGuard,
      RolesGuard,

      // Global guards (same order as AppModule)
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },

      // Test-specific providers
      ...(options.providers ?? []),
    ],
  })

  const module = await moduleBuilder.compile()
  const app = module.createNestApplication()

  // ── Apply middleware matching main.ts ──
  app.use(json({ limit: '1mb' }))
  app.use(urlencoded({ extended: true, limit: '1mb' }))

  // Global prefix (exclude public endpoints)
  app.setGlobalPrefix('unilink/api/v1', {
    exclude: [
      '.well-known/did.json',
      '.well-known/status-list/:id',
      'health',
      'health/ready',
      'metrics',
    ],
  })

  // Validation pipe (same config as main.ts)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  // Exception filter
  app.useGlobalFilters(new GlobalExceptionFilter())

  await app.init()

  return { app, module }
}
