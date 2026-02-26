import { ExecutionContext } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SisWebhookGuard } from '../guards/sis-webhook.guard'
import { UniLinkException } from '@unilink/dto'

describe('SisWebhookGuard', () => {
  let guard: SisWebhookGuard
  let configService: jest.Mocked<ConfigService>

  const createMockContext = (headers: Record<string, string> = {}): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as unknown as ExecutionContext

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>

    guard = new SisWebhookGuard(configService)
  })

  it('should pass when secret matches', () => {
    configService.get.mockReturnValue('valid-secret-at-least-32-characters-long')
    const context = createMockContext({
      'x-webhook-secret': 'valid-secret-at-least-32-characters-long',
    })

    expect(guard.canActivate(context)).toBe(true)
  })

  it('should throw 401 when secret header is missing', () => {
    configService.get.mockReturnValue('valid-secret-at-least-32-characters-long')
    const context = createMockContext({})

    expect(() => guard.canActivate(context)).toThrow(UniLinkException)
    try {
      guard.canActivate(context)
    } catch (error) {
      expect(error).toBeInstanceOf(UniLinkException)
      expect((error as UniLinkException).code).toBe('SIS_SIGNATURE_INVALID')
      expect((error as UniLinkException).statusCode).toBe(401)
    }
  })

  it('should throw 401 when secret does not match', () => {
    configService.get.mockReturnValue('valid-secret-at-least-32-characters-long')
    const context = createMockContext({
      'x-webhook-secret': 'wrong-secret',
    })

    expect(() => guard.canActivate(context)).toThrow(UniLinkException)
    try {
      guard.canActivate(context)
    } catch (error) {
      expect(error).toBeInstanceOf(UniLinkException)
      expect((error as UniLinkException).code).toBe('SIS_SIGNATURE_INVALID')
      expect((error as UniLinkException).statusCode).toBe(401)
    }
  })

  it('should throw 503 when SIS_WEBHOOK_SECRET is not configured', () => {
    configService.get.mockReturnValue(undefined)
    const context = createMockContext({
      'x-webhook-secret': 'any-secret',
    })

    expect(() => guard.canActivate(context)).toThrow(UniLinkException)
    try {
      guard.canActivate(context)
    } catch (error) {
      expect(error).toBeInstanceOf(UniLinkException)
      expect((error as UniLinkException).code).toBe('SIS_WEBHOOK_INVALID')
      expect((error as UniLinkException).statusCode).toBe(503)
    }
  })

  it('should throw 401 when secret header is empty string', () => {
    configService.get.mockReturnValue('valid-secret-at-least-32-characters-long')
    const context = createMockContext({
      'x-webhook-secret': '',
    })

    expect(() => guard.canActivate(context)).toThrow(UniLinkException)
    try {
      guard.canActivate(context)
    } catch (error) {
      expect(error).toBeInstanceOf(UniLinkException)
      expect((error as UniLinkException).code).toBe('SIS_SIGNATURE_INVALID')
    }
  })
})
