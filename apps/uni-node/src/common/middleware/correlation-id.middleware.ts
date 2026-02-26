import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

/**
 * Express middleware that generates or forwards a correlation ID.
 *
 * - If the incoming request has `X-Correlation-Id` header, reuse it (cross-service tracing)
 * - Otherwise, generate a new UUID
 * - Attach to `req.correlationId` for downstream use
 * - Set `X-Correlation-Id` on the response for the client
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incomingId = req.headers['x-correlation-id'] as string | undefined
  const correlationId = incomingId || uuidv4()

  // Attach to request object for access in controllers/services
  ;(req as Request & { correlationId: string }).correlationId = correlationId

  // Set response header so clients and downstream services can trace
  res.setHeader('X-Correlation-Id', correlationId)

  next()
}
