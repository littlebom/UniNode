import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import compression from 'compression'
import hpp from 'hpp'
import { json, urlencoded } from 'express'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { correlationIdMiddleware } from './common/middleware/correlation-id.middleware'
import { createRequestLoggerMiddleware } from './common/middleware/request-logger.middleware'

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap')

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  })

  const config = app.get(ConfigService)

  // Trust proxy (for correct IP behind reverse proxy / k8s)
  const expressApp = app.getHttpAdapter().getInstance()
  expressApp.set('trust proxy', 1)

  // ── Observability Middleware ──

  // Correlation ID — trace requests across services
  app.use(correlationIdMiddleware)

  // Request Logger — log method, URL, status, response time
  app.use(createRequestLoggerMiddleware('Node'))

  // ── Security Middleware ──

  // Helmet — security headers
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

  // Compression — gzip response
  app.use(compression())

  // HPP — HTTP Parameter Pollution protection
  app.use(hpp())

  // Body size limits
  app.use(json({ limit: '1mb' }))
  app.use(urlencoded({ extended: true, limit: '1mb' }))

  // Global Prefix
  const prefix = config.get<string>('API_PREFIX', 'unilink/api/v1')
  app.setGlobalPrefix(prefix, {
    exclude: ['.well-known/did.json', '.well-known/status-list/:id', 'health', 'health/ready', 'metrics'],
  })

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter())

  // CORS
  const corsOrigins = config.get<string>('CORS_ORIGINS', '')
  app.enableCors({
    origin: corsOrigins.split(',').filter(Boolean),
    credentials: true,
  })

  // Enable graceful shutdown hooks (OnModuleDestroy, beforeApplicationShutdown)
  app.enableShutdownHooks()

  const port = config.get<number>('PORT', 3010)
  await app.listen(port)

  const nodeId = config.get<string>('NODE_ID', 'unknown')
  logger.log(`UniLink Node [${nodeId}] running on port ${port}`)
  logger.log(`API prefix: /${prefix}`)
  logger.log('Security middleware enabled: helmet, compression, hpp')
  logger.log('Observability: correlation-id, request-logger, /metrics')

  // ── Graceful Shutdown ──
  let isShuttingDown = false
  const gracefulShutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return
    isShuttingDown = true
    logger.log(`Received ${signal}. Starting graceful shutdown...`)

    const forceExitTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timed out after 30s, forcing exit')
      process.exit(1)
    }, 30000)
    forceExitTimeout.unref()

    try {
      await app.close()
      logger.log('Graceful shutdown complete')
      process.exit(0)
    } catch (err) {
      logger.error('Error during graceful shutdown', err)
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
}

bootstrap()
