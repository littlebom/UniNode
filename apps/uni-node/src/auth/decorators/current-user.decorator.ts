import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'

export interface AuthenticatedUser {
  sub: string
  studentId?: string
  nodeId?: string
  role: string
  /** Registry JWT: central DID (did:web:unilink.ac.th:id:{uuid}) */
  did?: string
  /** Registry JWT: active enrollments */
  enrollments?: Array<{
    nodeId: string
    localStudentId: string
    status: string
  }>
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
