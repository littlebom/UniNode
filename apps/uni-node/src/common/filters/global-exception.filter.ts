import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { UniLinkException } from '@unilink/dto'
import { v4 as uuidv4 } from 'uuid'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const traceId = uuidv4()

    let status: number
    let code: string
    let message: string
    let messageTH: string | undefined
    let details: unknown

    if (exception instanceof UniLinkException) {
      status = exception.statusCode
      code = exception.code
      message = exception.message
      messageTH = exception.messageTH
      details = exception.details
    } else if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exResponse = exception.getResponse()
      if (typeof exResponse === 'object' && exResponse !== null) {
        const obj = exResponse as Record<string, unknown>
        code = (obj['error'] as string) ?? 'HTTP_ERROR'
        message = Array.isArray(obj['message'])
          ? (obj['message'] as string[]).join(', ')
          : (obj['message'] as string) ?? exception.message
        details = obj['message']
      } else {
        code = 'HTTP_ERROR'
        message = typeof exResponse === 'string' ? exResponse : exception.message
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR
      code = 'INTERNAL_ERROR'
      message = 'An unexpected error occurred'
      // Never log PII
      this.logger.error(
        `Unhandled exception [${traceId}]: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
      )
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        messageTH,
        details: status === HttpStatus.INTERNAL_SERVER_ERROR ? undefined : details,
        traceId,
      },
      timestamp: new Date().toISOString(),
    })
  }
}
