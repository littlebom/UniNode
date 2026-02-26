import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { timingSafeEqual } from 'node:crypto'
import { UniLinkException, UniLinkErrorCode } from '@unilink/dto'
import type { Request } from 'express'

@Injectable()
export class SisWebhookGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const secret = request.headers['x-webhook-secret'] as string | undefined
    const expectedSecret = this.config.get<string>('SIS_WEBHOOK_SECRET')

    if (!expectedSecret) {
      throw new UniLinkException(
        UniLinkErrorCode.SIS_WEBHOOK_INVALID,
        503,
        'SIS webhook is not configured on this node',
        'SIS webhook ยังไม่ได้ตั้งค่าบน node นี้',
      )
    }

    if (!secret) {
      throw new UniLinkException(
        UniLinkErrorCode.SIS_SIGNATURE_INVALID,
        401,
        'Invalid webhook secret',
        'Webhook secret ไม่ถูกต้อง',
      )
    }

    // Use constant-time comparison to prevent timing attacks
    const secretBuf = Buffer.from(secret, 'utf-8')
    const expectedBuf = Buffer.from(expectedSecret, 'utf-8')

    if (
      secretBuf.length !== expectedBuf.length ||
      !timingSafeEqual(secretBuf, expectedBuf)
    ) {
      throw new UniLinkException(
        UniLinkErrorCode.SIS_SIGNATURE_INVALID,
        401,
        'Invalid webhook secret',
        'Webhook secret ไม่ถูกต้อง',
      )
    }

    return true
  }
}
