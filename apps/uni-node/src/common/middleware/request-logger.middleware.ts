import { Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

/** Paths to skip logging (high-frequency health checks reduce noise) */
const SKIP_PATHS = ['/health', '/health/ready', '/metrics']

/**
 * Creates an Express middleware that logs HTTP requests with:
 * - Method, URL, Status Code, Response Time (ms)
 * - Correlation ID (from correlation-id middleware)
 * - Content-Length of response
 *
 * Skips health/metrics endpoints to reduce log noise.
 */
export function createRequestLoggerMiddleware(
  serviceName: string,
): (req: Request, res: Response, next: NextFunction) => void {
  const logger = new Logger(`HTTP:${serviceName}`)

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip health/metrics to reduce noise
    if (SKIP_PATHS.some((p) => req.originalUrl.startsWith(p))) {
      next()
      return
    }

    const startTime = Date.now()

    // Listen for response finish event
    res.on('finish', () => {
      const duration = Date.now() - startTime
      const correlationId = (
        req as Request & { correlationId?: string }
      ).correlationId
      const contentLength = res.getHeader('content-length') ?? '-'

      const logLine = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms ${contentLength}b${correlationId ? ` [${correlationId.substring(0, 8)}]` : ''}`

      if (res.statusCode >= 500) {
        logger.error(logLine)
      } else if (res.statusCode >= 400) {
        logger.warn(logLine)
      } else {
        logger.log(logLine)
      }
    })

    next()
  }
}
