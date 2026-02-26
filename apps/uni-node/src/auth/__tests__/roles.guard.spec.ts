import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RolesGuard } from '../guards/roles.guard'
import { UniLinkException } from '@unilink/dto'

describe('RolesGuard', () => {
  let guard: RolesGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
    guard = new RolesGuard(reflector)
  })

  function createMockContext(user?: { sub: string; role?: string }): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext
  }

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)

    const context = createMockContext({ sub: 'user-1', role: 'student' })
    expect(guard.canActivate(context)).toBe(true)
  })

  it('should allow access when empty roles array', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([])

    const context = createMockContext({ sub: 'user-1', role: 'student' })
    expect(guard.canActivate(context)).toBe(true)
  })

  it('should allow access when user has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['staff'])

    const context = createMockContext({ sub: 'user-1', role: 'staff' })
    expect(guard.canActivate(context)).toBe(true)
  })

  it('should allow node_admin to access everything', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['staff'])

    const context = createMockContext({ sub: 'admin-1', role: 'node_admin' })
    expect(guard.canActivate(context)).toBe(true)
  })

  it('should deny access when user has wrong role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['node_admin'])

    const context = createMockContext({ sub: 'user-1', role: 'student' })

    expect(() => guard.canActivate(context)).toThrow(UniLinkException)
    expect(() => guard.canActivate(context)).toThrow('Insufficient permissions')
  })

  it('should deny access when user has no role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['staff'])

    const context = createMockContext({ sub: 'user-1' })

    expect(() => guard.canActivate(context)).toThrow(UniLinkException)
    expect(() => guard.canActivate(context)).toThrow('No role assigned')
  })

  it('should deny access when no user present', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['staff'])

    const context = createMockContext(undefined)

    expect(() => guard.canActivate(context)).toThrow(UniLinkException)
  })
})
