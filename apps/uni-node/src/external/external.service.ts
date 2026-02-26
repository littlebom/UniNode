import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ExternalRepository } from './external.repository'
import { VCService } from '../vc/vc.service'
import { StudentService } from '../student/student.service'
import { SubmitExternalDto } from './dto/submit-external.dto'
import { ApproveExternalDto } from './dto/approve-external.dto'
import { RejectExternalDto } from './dto/reject-external.dto'
import { UniLinkException, UniLinkErrorCode } from '@unilink/dto'
import type {
  ExternalListItem,
  ExternalDetail,
  PaginatedResponse,
} from '@unilink/dto'
import type { ExternalCredentialEntity } from './external-credential.entity'

// ── Platform Registry (Governance) ──────────────────────

interface PlatformConfig {
  tier: number
  minScore: number
  minHours?: number
}

const PLATFORM_REGISTRY: Record<string, PlatformConfig> = {
  Coursera: { tier: 1, minScore: 70 },
  edX: { tier: 1, minScore: 70 },
  FutureLearn: { tier: 1, minScore: 70 },
  OpenLearn: { tier: 1, minScore: 70 },
  Udemy: { tier: 2, minScore: 80, minHours: 20 },
  'LinkedIn Learning': { tier: 2, minScore: 80, minHours: 20 },
  'Google Career Certificates': { tier: 2, minScore: 80, minHours: 20 },
  'Microsoft Learn': { tier: 2, minScore: 80, minHours: 20 },
}

const MAX_CREDITS_PER_YEAR = 15
const MAX_CREDITS_TOTAL = 30

@Injectable()
export class ExternalService {
  private readonly logger = new Logger(ExternalService.name)

  constructor(
    private readonly externalRepo: ExternalRepository,
    private readonly vcService: VCService,
    private readonly studentService: StudentService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Submit a new external credential recognition request.
   *
   * Validates:
   * 1. Student exists
   * 2. Platform is supported
   */
  async submitRequest(dto: SubmitExternalDto): Promise<ExternalDetail> {
    // 1. Validate student exists
    await this.studentService.findByStudentId(dto.studentId)

    // 2. Validate platform is supported
    const platformConfig = PLATFORM_REGISTRY[dto.platform]
    if (!platformConfig) {
      throw new UniLinkException(
        UniLinkErrorCode.EXTERNAL_PLATFORM_UNSUPPORTED,
        422,
        `Platform "${dto.platform}" is not supported`,
        `แพลตฟอร์ม "${dto.platform}" ไม่รองรับ`,
      )
    }

    // 3. Generate request ID
    const domain = this.config.get<string>('NODE_DOMAIN', 'localhost')
    const requestId = `ext-${domain.replace(/\./g, '-')}-${dto.studentId}-${Date.now()}`

    // 4. Create entity
    const entity = await this.externalRepo.create({
      requestId,
      studentId: dto.studentId,
      platform: dto.platform,
      platformTier: platformConfig.tier,
      courseName: dto.courseName,
      institution: dto.institution,
      completionDate: new Date(dto.completionDate),
      score: dto.score ?? null,
      completionHours: dto.completionHours ?? null,
      certificateUrl: dto.certificateUrl ?? null,
      certificatePdfUrl: dto.certificatePdfUrl ?? null,
      verificationUrl: dto.verificationUrl ?? null,
      requestedCourseId: dto.requestedCourseId ?? null,
      originalVcId: dto.originalVcId ?? null,
      status: 'pending',
      requestedAt: new Date(),
    })

    this.logger.log(
      `External credential request created: ${requestId} for student ${dto.studentId} (${dto.platform})`,
    )

    return this.toDetail(entity)
  }

  /**
   * List external credential requests with optional filters and pagination.
   */
  async listRequests(
    params?: { page?: number; limit?: number; status?: string },
  ): Promise<PaginatedResponse<ExternalListItem>> {
    const page = params?.page ?? 1
    const limit = params?.limit ?? 20

    const { data, total } = await this.externalRepo.findAll({
      page,
      limit,
      status: params?.status,
    })

    return {
      data: data.map((entity) => this.toListItem(entity)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Get detailed information about a single external credential request.
   */
  async getDetail(requestId: string): Promise<ExternalDetail> {
    const entity = await this.externalRepo.findByRequestId(requestId)
    if (!entity) {
      throw new UniLinkException(
        UniLinkErrorCode.EXTERNAL_NOT_FOUND,
        404,
        `External credential request ${requestId} not found`,
        `ไม่พบคำขอ External Credential ${requestId}`,
      )
    }

    return this.toDetail(entity)
  }

  /**
   * Approve an external credential request.
   *
   * Validates:
   * 1. Request exists and is pending
   * 2. Credit limits (per year + total) not exceeded
   * 3. Issues AchievementCredential VC
   */
  async approve(
    requestId: string,
    dto: ApproveExternalDto,
    reviewedBy: string,
  ): Promise<ExternalDetail> {
    // 1. Find and validate status
    const entity = await this.externalRepo.findByRequestId(requestId)
    if (!entity) {
      throw new UniLinkException(
        UniLinkErrorCode.EXTERNAL_NOT_FOUND,
        404,
        `External credential request ${requestId} not found`,
        `ไม่พบคำขอ External Credential ${requestId}`,
      )
    }

    if (entity.status !== 'pending') {
      throw new UniLinkException(
        UniLinkErrorCode.EXTERNAL_ALREADY_PROCESSED,
        409,
        `External credential request ${requestId} has already been ${entity.status}`,
        `คำขอ External Credential ${requestId} ได้รับการดำเนินการแล้ว (${entity.status})`,
      )
    }

    // 2. Check credit limits
    const completionYear = entity.completionDate.getFullYear()
    const creditsThisYear = await this.externalRepo.countCreditsForStudent(
      entity.studentId,
      completionYear,
    )
    if (creditsThisYear + dto.recognizedCredits > MAX_CREDITS_PER_YEAR) {
      throw new UniLinkException(
        UniLinkErrorCode.EXTERNAL_CREDIT_LIMIT_EXCEEDED,
        422,
        `Approving ${dto.recognizedCredits} credits would exceed the annual limit of ${MAX_CREDITS_PER_YEAR} (current: ${creditsThisYear})`,
        `การอนุมัติ ${dto.recognizedCredits} หน่วยกิตจะเกินเพดานต่อปี ${MAX_CREDITS_PER_YEAR} (ปัจจุบัน: ${creditsThisYear})`,
      )
    }

    const creditsTotal = await this.externalRepo.countCreditsForStudent(
      entity.studentId,
    )
    if (creditsTotal + dto.recognizedCredits > MAX_CREDITS_TOTAL) {
      throw new UniLinkException(
        UniLinkErrorCode.EXTERNAL_CREDIT_LIMIT_EXCEEDED,
        422,
        `Approving ${dto.recognizedCredits} credits would exceed the total limit of ${MAX_CREDITS_TOTAL} (current: ${creditsTotal})`,
        `การอนุมัติ ${dto.recognizedCredits} หน่วยกิตจะเกินเพดานรวม ${MAX_CREDITS_TOTAL} (ปัจจุบัน: ${creditsTotal})`,
      )
    }

    // 3. Issue AchievementCredential VC
    const vcIdOverride = `vc-achievement-${entity.requestId}`
    const domain = this.config.get<string>('NODE_DOMAIN', 'localhost')

    const vcResult = await this.vcService.issueVC(
      {
        studentId: entity.studentId,
        vcType: 'AchievementCredential',
        courseId: dto.recognizedCourseId,
        grade: 'S', // S/U grading for external credentials
        gradePoint: 0, // Does not affect GPA
        semester: 'EXT', // External — not a regular semester
        academicYear: String(completionYear + 543), // Convert to พ.ศ.
      },
      { vcIdOverride },
    )

    // 4. Update entity
    const updated = await this.externalRepo.updateStatus(
      requestId,
      'approved',
      {
        recognizedCourseId: dto.recognizedCourseId,
        recognizedCredits: dto.recognizedCredits,
        reviewedBy,
        reviewNote: dto.note ?? null,
        issuedVcId: vcResult.vcId,
        decidedAt: new Date(),
      },
    )

    this.logger.log(
      `External credential approved: ${requestId} — VC issued: ${vcResult.vcId} — credits: ${dto.recognizedCredits}`,
    )

    return this.toDetail(updated)
  }

  /**
   * Reject an external credential request.
   */
  async reject(
    requestId: string,
    dto: RejectExternalDto,
    reviewedBy: string,
  ): Promise<ExternalDetail> {
    const entity = await this.externalRepo.findByRequestId(requestId)
    if (!entity) {
      throw new UniLinkException(
        UniLinkErrorCode.EXTERNAL_NOT_FOUND,
        404,
        `External credential request ${requestId} not found`,
        `ไม่พบคำขอ External Credential ${requestId}`,
      )
    }

    if (entity.status !== 'pending') {
      throw new UniLinkException(
        UniLinkErrorCode.EXTERNAL_ALREADY_PROCESSED,
        409,
        `External credential request ${requestId} has already been ${entity.status}`,
        `คำขอ External Credential ${requestId} ได้รับการดำเนินการแล้ว (${entity.status})`,
      )
    }

    const updated = await this.externalRepo.updateStatus(
      requestId,
      'rejected',
      {
        reviewedBy,
        reviewNote: dto.note ?? null,
        decidedAt: new Date(),
      },
    )

    this.logger.log(
      `External credential rejected: ${requestId} — reason: ${dto.note ?? 'N/A'}`,
    )

    return this.toDetail(updated)
  }

  /**
   * Get the platform configuration for a given platform name.
   */
  getPlatformConfig(platform: string): PlatformConfig | undefined {
    return PLATFORM_REGISTRY[platform]
  }

  // ── Private Mappers ─────────────────────────────────────

  private toListItem(entity: ExternalCredentialEntity): ExternalListItem {
    return {
      requestId: entity.requestId,
      studentId: entity.studentId,
      platform: entity.platform,
      courseName: entity.courseName,
      institution: entity.institution,
      status: entity.status as 'pending' | 'approved' | 'rejected',
      requestedAt: entity.requestedAt.toISOString(),
    }
  }

  private toDetail(entity: ExternalCredentialEntity): ExternalDetail {
    return {
      requestId: entity.requestId,
      studentId: entity.studentId,
      platform: entity.platform,
      courseName: entity.courseName,
      institution: entity.institution,
      completionDate: entity.completionDate instanceof Date
        ? entity.completionDate.toISOString().split('T')[0]
        : String(entity.completionDate),
      score: entity.score != null ? String(entity.score) : null,
      hours: entity.completionHours,
      certificateUrl: entity.certificateUrl,
      certificatePdfUrl: entity.certificatePdfUrl,
      verificationUrl: entity.verificationUrl,
      requestedCourseId: entity.requestedCourseId,
      status: entity.status as 'pending' | 'approved' | 'rejected',
      reviewNote: entity.reviewNote,
      recognizedCourseId: entity.recognizedCourseId,
      recognizedCredits: entity.recognizedCredits,
      requestedAt: entity.requestedAt.toISOString(),
      decidedAt: entity.decidedAt?.toISOString() ?? null,
    }
  }
}
