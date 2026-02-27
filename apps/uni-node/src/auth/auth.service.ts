import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { StudentService } from '../student/student.service'
import { UniLinkException, UniLinkErrorCode } from '@unilink/dto'
import type { JwtPayload } from './jwt.strategy'

export interface LoginResult {
  token: string
  refreshToken: string
  did: string | null
}

export interface RefreshResult {
  token: string
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly studentService: StudentService,
  ) {}

  /**
   * Login a student and return JWT tokens.
   * Password verification is deferred to Sprint 5-6 (SIS/LDAP integration).
   * Currently verifies that the student exists and is active.
   */
  async login(studentId: string, _password: string): Promise<LoginResult> {
    const student = await this.studentService.findByStudentId(studentId)

    if (student.status !== 'active') {
      throw new UniLinkException(
        UniLinkErrorCode.STUDENT_INACTIVE,
        403,
        `Student ${studentId} is not active`,
        `นักศึกษา ${studentId} ไม่ได้อยู่ในสถานะ active`,
      )
    }

    // TODO: Sprint 5-6 — Verify password via SIS/LDAP
    // For now, accept any non-empty password for development

    const payload: JwtPayload = {
      sub: student.id,
      studentId: student.studentId,
      role: 'student',
    }

    const token = this.jwtService.sign(payload)

    const refreshSecret =
      this.configService.get<string>('JWT_SECRET') + ':refresh'
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: '7d',
    })

    this.logger.log(`Student logged in: ${studentId}`)

    return {
      token,
      refreshToken,
      did: student.did,
    }
  }

  /**
   * Refresh an access token using a valid refresh token.
   */
  async refresh(refreshToken: string): Promise<RefreshResult> {
    const refreshSecret =
      this.configService.get<string>('JWT_SECRET') + ':refresh'

    let payload: JwtPayload
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      })
    } catch {
      throw new UniLinkException(
        UniLinkErrorCode.AUTH_REFRESH_INVALID,
        401,
        'Invalid or expired refresh token',
        'Refresh token ไม่ถูกต้องหรือหมดอายุ',
      )
    }

    const newPayload: JwtPayload = {
      sub: payload.sub,
      studentId: payload.studentId,
      role: payload.role,
    }

    const token = this.jwtService.sign(newPayload)

    this.logger.log(`Token refreshed for student: ${payload.studentId}`)

    return { token }
  }

  /**
   * Link or create a local student record from a Registry JWT payload.
   * Called when a student authenticates with a Registry-issued JWT for the first time.
   *
   * If the student already exists (by studentId), updates didUuid + didWeb.
   * If the student doesn't exist, creates a new record.
   */
  async linkRegistryIdentity(payload: {
    sub: string       // Registry identity UUID
    did: string       // did:web:unilink.ac.th:id:{uuid}
    studentId: string // localStudentId from enrollment
  }): Promise<{ linked: boolean }> {
    let student: import('../student/student.entity').StudentEntity | null = null
    try {
      student = await this.studentService.findByStudentId(payload.studentId)
    } catch {
      // Student not found — will create below
    }

    if (student) {
      // Update existing student with Registry identity link
      if (!student.didUuid) {
        await this.studentService.update(payload.studentId, {
          didUuid: payload.sub,
          didWeb: payload.did,
        })
        this.logger.log(
          `Student ${payload.studentId} linked to Registry identity: ${payload.did}`,
        )
      }
      return { linked: true }
    }

    // Create new student record (first time this student accesses this node)
    await this.studentService.create({
      studentId: payload.studentId,
      did: payload.did,
      didUuid: payload.sub,
      didWeb: payload.did,
    })
    this.logger.log(
      `Student ${payload.studentId} created from Registry identity: ${payload.did}`,
    )
    return { linked: true }
  }

  /**
   * Register a DID and public key for a student.
   * Called after the wallet generates an Ed25519 keypair.
   */
  async registerDID(
    authenticatedStudentId: string,
    studentId: string,
    did: string,
    publicKey: string,
  ): Promise<{ did: string; publicKey: string }> {
    // Ensure the authenticated user is registering their own DID
    if (authenticatedStudentId !== studentId) {
      throw new UniLinkException(
        UniLinkErrorCode.STUDENT_DID_MISMATCH,
        403,
        'Cannot register DID for another student',
        'ไม่สามารถลงทะเบียน DID ให้นักศึกษาคนอื่นได้',
      )
    }

    // Validate DID contains the student's ID
    const didParts = did.split(':')
    const didStudentId = didParts[didParts.length - 1]
    if (didStudentId !== studentId) {
      throw new UniLinkException(
        UniLinkErrorCode.INVALID_DID_FORMAT,
        400,
        `DID student ID "${didStudentId}" does not match "${studentId}"`,
        `Student ID ใน DID ไม่ตรงกับ Student ID ที่ยืนยันตัวตน`,
      )
    }

    const student = await this.studentService.findByStudentId(studentId)

    // Check if DID is already set
    if (student.did && student.did !== did) {
      throw new UniLinkException(
        UniLinkErrorCode.STUDENT_DID_MISMATCH,
        409,
        `Student ${studentId} already has a different DID registered`,
        `นักศึกษา ${studentId} มี DID ที่ลงทะเบียนแล้ว`,
      )
    }

    await this.studentService.update(studentId, {
      did,
      publicKey,
    })

    this.logger.log(`DID registered for student: ${studentId} → ${did}`)

    return { did, publicKey }
  }
}
