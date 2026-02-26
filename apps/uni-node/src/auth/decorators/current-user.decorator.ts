import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'

export interface AuthenticatedUser {
  sub: string
  studentId?: string
  nodeId?: string
  role: string
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>()
    const user = request.user as AuthenticatedUser | undefined
    if (!user) return undefined
    return data ? user[data] : user
  },
)
