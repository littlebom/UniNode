import { Injectable, Inject, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import { VCService } from '../vc/vc.service'
import { VCRepository } from '../vc/vc.repository'
import { StudentService } from '../student/student.service'
import { SisWebhookDto } from './dto/sis-webhook.dto'
import { IssueVcDto } from '../vc/dto/issue-vc.dto'
import { UniLinkException, UniLinkErrorCode } from '@unilink/dto'

export interface SisWebhookResult {
  received: true
  event: string
  vcId?: string
}

const GRADE_POINT_MAP: Record<string, number> = {
  'A': 4.0,
  'B+': 3.5,
  'B': 3.0,
  'C+': 2.5,
  'C': 2.0,
  'D+': 1.5,
  'D': 1.0,
  'F': 0.0,
  'S': 0.0,
  'U': 0.0,
}

@Injectable()
export class SisService {
  private readonly logger = new Logger(SisService.name)

  constructor(
    private readonly vcService: VCService,
    private readonly vcRepo: VCRepository,
    private readonly studentService: StudentService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Process an incoming SIS webhook event.
   */
  async processWebhook(dto: SisWebhookDto): Promise<SisWebhookResult> {
    this.logger.log(
      `SIS webhook received: ${dto.event} — student=${dto.studentId} course=${dto.courseId}`,
    )

    // Invalidate course cache after any SIS event (course data may have changed)
    await this.cacheManager.reset()
    this.logger.debug('Course cache invalidated after SIS webhook')

    switch (dto.event) {
      case 'grade.recorded':
        return this.handleGradeRecorded(dto)
      case 'grade.updated':
        return this.handleGradeUpdated(dto)
      case 'grade.cancelled':
        return this.handleGradeCancelled(dto)
      default:
        throw new UniLinkException(
          UniLinkErrorCode.SIS_WEBHOOK_INVALID,
          400,
          `Unknown SIS webhook event: ${dto.event as string}`,
          `ไม่รู้จัก SIS webhook event: ${dto.event as string}`,
        )
    }
  }

  /**
   * Handle grade.recorded: ensure student exists, then issue VC.
   * Idempotent — returns existing VC if already issued.
   */
  private async handleGradeRecorded(dto: SisWebhookDto): Promise<SisWebhookResult> {
    await this.ensureStudentExists(dto.studentId)

    const issueDto = this.buildIssueDto(dto)

    try {
      const result = await this.vcService.issueVC(issueDto)
      this.logger.log(`VC issued from SIS: ${result.vcId}`)
      return { received: true, event: dto.event, vcId: result.vcId }
    } catch (error) {
      // Idempotent: if VC already exists (409), return existing
      if (
        error instanceof UniLinkException &&
        error.code === UniLinkErrorCode.VC_ISSUE_FAILED &&
        error.statusCode === 409
      ) {
        const baseVcId = this.buildBaseVcId(dto)
        this.logger.warn(`VC already exists for SIS event: ${baseVcId}`)
        return { received: true, event: dto.event, vcId: baseVcId }
      }
      throw error
    }
  }

  /**
   * Handle grade.updated: revoke old VC, issue new one with version suffix.
   */
  private async handleGradeUpdated(dto: SisWebhookDto): Promise<SisWebhookResult> {
    await this.ensureStudentExists(dto.studentId)

    const baseVcId = this.buildBaseVcId(dto)

    // 1. Try to revoke existing active VC
    await this.tryRevokeActiveVc(baseVcId, 'Grade updated by SIS')

    // 2. Also check versioned VCs (e.g., baseVcId-v2, -v3)
    const existingCount = await this.vcRepo.countByVcIdPrefix(baseVcId)

    // 3. Determine new vcId
    const newVcId = existingCount > 0
      ? `${baseVcId}-v${existingCount + 1}`
      : baseVcId

    // 4. Issue new VC
    const issueDto = this.buildIssueDto(dto)
    const result = await this.vcService.issueVC(issueDto, { vcIdOverride: newVcId })

    this.logger.log(`VC re-issued from SIS grade update: ${result.vcId} (was ${baseVcId})`)
    return { received: true, event: dto.event, vcId: result.vcId }
  }

  /**
   * Handle grade.cancelled: revoke the VC if it exists.
   */
  private async handleGradeCancelled(dto: SisWebhookDto): Promise<SisWebhookResult> {
    const baseVcId = this.buildBaseVcId(dto)

    // Try to revoke base vcId or any versioned VC
    const revoked = await this.tryRevokeActiveVc(
      baseVcId,
      'Grade cancelled by SIS',
    )

    if (!revoked) {
      // Try versioned VCs
      const count = await this.vcRepo.countByVcIdPrefix(baseVcId)
      if (count > 0) {
        // Try revoking the latest version
        for (let v = count; v >= 2; v--) {
          const versionedVcId = `${baseVcId}-v${v}`
          const vRevoked = await this.tryRevokeActiveVc(
            versionedVcId,
            'Grade cancelled by SIS',
          )
          if (vRevoked) break
        }
      }
    }

    this.logger.log(`SIS grade cancelled processed: ${baseVcId}`)
    return { received: true, event: dto.event }
  }

  /**
   * Ensure student exists in the system. Auto-create if missing.
   */
  private async ensureStudentExists(studentId: string): Promise<void> {
    try {
      await this.studentService.findByStudentId(studentId)
    } catch (error) {
      if (
        error instanceof UniLinkException &&
        error.code === UniLinkErrorCode.STUDENT_NOT_FOUND
      ) {
        await this.studentService.create({ studentId })
        this.logger.log(`Auto-created student ${studentId} from SIS webhook`)
      } else {
        throw error
      }
    }
  }

  /**
   * Try to revoke a VC by its ID. Returns true if revoked, false if not found or already revoked.
   */
  private async tryRevokeActiveVc(vcId: string, reason: string): Promise<boolean> {
    try {
      const existing = await this.vcService.getVC(vcId)
      if (existing.status === 'revoked') {
        return false
      }
      await this.vcService.revokeVC(vcId, reason)
      return true
    } catch (error) {
      if (
        error instanceof UniLinkException &&
        error.code === UniLinkErrorCode.VC_NOT_FOUND
      ) {
        return false
      }
      throw error
    }
  }

  /**
   * Build the base VC ID from SIS webhook data.
   */
  private buildBaseVcId(dto: SisWebhookDto): string {
    const domain = this.config.get<string>('NODE_DOMAIN', 'localhost')
    const nodeId = this.config.get<string>('NODE_ID', domain)
    return `vc-${nodeId.replace(/\./g, '-')}-${dto.courseId.toLowerCase()}-${dto.studentId}-${dto.academicYear}-${dto.semester}`
  }

  /**
   * Convert SIS webhook payload into IssueVcDto.
   */
  private buildIssueDto(dto: SisWebhookDto): IssueVcDto {
    const issueDto = new IssueVcDto()
    issueDto.studentId = dto.studentId
    issueDto.courseId = dto.courseId
    issueDto.grade = dto.grade
    issueDto.gradePoint = this.gradeToGradePoint(dto.grade)
    issueDto.semester = dto.semester
    issueDto.academicYear = dto.academicYear
    issueDto.deliveryMode = dto.deliveryMode
    return issueDto
  }

  /**
   * Convert letter grade to grade point (Thai university standard).
   */
  private gradeToGradePoint(grade: string): number {
    const gradePoint = GRADE_POINT_MAP[grade]
    if (gradePoint === undefined) {
      throw new UniLinkException(
        UniLinkErrorCode.SIS_DATA_INCOMPLETE,
        422,
        `Invalid grade: ${grade}`,
        `เกรดไม่ถูกต้อง: ${grade}`,
      )
    }
    return gradePoint
  }
}
