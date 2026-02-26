import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { UniLinkException, UniLinkErrorCode } from '@unilink/dto'

interface UserPayload {
  sub: string
  role?: string
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      string[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()])

    // If no roles decorator, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: UserPayload }>()
    const user = request.user

    if (!user || !user.role) {
      throw new UniLinkException(
        UniLinkErrorCode.AUTH_FORBIDDEN,
        403,
        'No role assigned',
        'ไม่มีบทบาทกำหนด',
      )
    }

    // node_admin has access to everything in uni-node
    if (user.role === 'node_admin') {
      return true
    }

    const hasRole = requiredRoles.includes(user.role)
    if (!hasRole) {
      throw new UniLinkException(
        UniLinkErrorCode.AUTH_FORBIDDEN,
        403,
        'Insufficient permissions',
        'สิทธิ์ไม่เพียงพอ',
      )
    }

    return true
  }
}
