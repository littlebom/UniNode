import { Injectable, Logger } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'

export interface JwtPayload {
  sub: string
  studentId?: string
  nodeId?: string
  role?: string
  /** Registry JWT: central DID (did:web:unilink.ac.th:id:{uuid}) */
  did?: string
  /** Registry JWT: active enrollments at various nodes */
  enrollments?: Array<{
    nodeId: string
    localStudentId: string
    status: string
  }>
  iat?: number
  exp?: number
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name)
  private readonly nodeId: string

  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    })
    this.nodeId = config.get<string>('NODE_ID', '')
  }

  /**
   * Validate JWT payload — supports both Node-issued and Registry-issued formats.
   *
   * Node-issued: { sub, studentId, nodeId, role }
   * Registry-issued: { sub, did, role: 'student', enrollments: [{nodeId, localStudentId, status}] }
   *
   * For Registry JWTs, extract studentId from the enrollments array matching this node,
   * and auto-link the Registry identity (didUuid + didWeb) to the local student record.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (payload.did && payload.enrollments && !payload.studentId) {
      const enrollment = payload.enrollments.find(
        (e) => e.nodeId === this.nodeId && e.status === 'active',
      )
      if (enrollment) {
        payload.studentId = enrollment.localStudentId
        payload.nodeId = this.nodeId

        // Auto-link Registry identity to local student record (idempotent)
        try {
          await this.authService.linkRegistryIdentity({
            sub: payload.sub,
            did: payload.did,
            studentId: enrollment.localStudentId,
          })
        } catch (error) {
          // Non-blocking: log but don't fail auth
          this.logger.warn(
            `Failed to auto-link Registry identity for ${enrollment.localStudentId}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          )
        }
      }
    }
    return payload
  }
}
