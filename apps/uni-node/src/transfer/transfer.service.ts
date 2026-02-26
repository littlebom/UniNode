import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TransferRepository } from './transfer.repository'
import { CreateTransferDto } from './dto/create-transfer.dto'
import { VCService } from '../vc/vc.service'
import { VCRepository } from '../vc/vc.repository'
import { StudentService } from '../student/student.service'
import { UniLinkException, UniLinkErrorCode } from '@unilink/dto'
import type { TransferResponse } from '@unilink/dto'
import type { CreditTransferEntity } from './credit-transfer.entity'

const MIN_GRADE_POINT = 2.5 // C+

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name)

  constructor(
    private readonly transferRepo: TransferRepository,
    private readonly vcService: VCService,
    private readonly vcRepo: VCRepository,
    private readonly studentService: StudentService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Create a new credit transfer request.
   *
   * Validates:
   * 1. Student exists
   * 2. Source VC exists and is active
   * 3. Source VC belongs to the student
   * 4. Grade is at least C+ (2.5)
   * 5. No duplicate transfer for same sourceVcId + targetNode
   */
  async createTransferRequest(dto: CreateTransferDto): Promise<TransferResponse> {
    // 1. Validate student exists
    await this.studentService.findByStudentId(dto.studentId)

    // 2. Validate source VC exists and is active
    const sourceVc = await this.vcRepo.findByVcId(dto.sourceVcId)
    if (!sourceVc) {
      throw new UniLinkException(
        UniLinkErrorCode.VC_NOT_FOUND,
        404,
        `Source VC ${dto.sourceVcId} not found`,
        `ไม่พบ VC ต้นทาง ${dto.sourceVcId}`,
      )
    }

    if (sourceVc.status === 'revoked') {
      throw new UniLinkException(
        UniLinkErrorCode.VC_REVOKED,
        410,
        `Source VC ${dto.sourceVcId} has been revoked`,
        `VC ต้นทาง ${dto.sourceVcId} ถูกยกเลิกแล้ว`,
      )
    }

    // 3. Validate VC belongs to the student
    if (sourceVc.studentId !== dto.studentId) {
      throw new UniLinkException(
        UniLinkErrorCode.VC_STUDENT_MISMATCH,
        400,
        `Source VC ${dto.sourceVcId} does not belong to student ${dto.studentId}`,
        `VC ต้นทาง ${dto.sourceVcId} ไม่ใช่ของนักศึกษา ${dto.studentId}`,
      )
    }

    // 4. Validate grade >= C+ (2.5)
    const vcDoc = sourceVc.vcDocument as Record<string, unknown>
    const subject = vcDoc.credentialSubject as Record<string, unknown>
    const gradePoint = typeof subject.gradePoint === 'number'
      ? subject.gradePoint
      : parseFloat(String(subject.gradePoint ?? '0'))

    if (gradePoint < MIN_GRADE_POINT) {
      throw new UniLinkException(
        UniLinkErrorCode.TRANSFER_GRADE_TOO_LOW,
        400,
        `Grade point ${gradePoint} is below minimum C+ (${MIN_GRADE_POINT})`,
        `เกรดพอยท์ ${gradePoint} ต่ำกว่าเกณฑ์ขั้นต่ำ C+ (${MIN_GRADE_POINT})`,
      )
    }

    // 5. Check no duplicate transfer
    const exists = await this.transferRepo.existsBySourceVcAndTarget(
      dto.sourceVcId,
      dto.targetNodeId,
    )
    if (exists) {
      throw new UniLinkException(
        UniLinkErrorCode.TRANSFER_ALREADY_EXISTS,
        409,
        `Transfer request for VC ${dto.sourceVcId} to ${dto.targetNodeId} already exists`,
        `คำขอโอนหน่วยกิตสำหรับ VC ${dto.sourceVcId} ไปยัง ${dto.targetNodeId} มีอยู่แล้ว`,
      )
    }

    // 6. Generate transfer ID
    const domain = this.config.get<string>('NODE_DOMAIN', 'localhost')
    const nodeId = this.config.get<string>('NODE_ID', domain)
    const transferId = `transfer-${nodeId.replace(/\./g, '-')}-${dto.sourceCourseId.toLowerCase()}-${dto.studentId}-${Date.now()}`

    // 7. Create transfer record
    const entity = await this.transferRepo.create({
      transferId,
      studentId: dto.studentId,
      sourceVcId: dto.sourceVcId,
      sourceCourse: dto.sourceCourseId,
      targetNode: dto.targetNodeId,
      targetCourse: dto.targetCourseId ?? null,
      status: 'pending',
      requestedAt: new Date(),
    })

    this.logger.log(
      `Transfer request created: ${transferId} for student ${dto.studentId}`,
    )

    return this.toResponse(entity)
  }

  /**
   * Get a transfer by its transfer ID.
   */
  async getTransfer(transferId: string): Promise<TransferResponse> {
    const entity = await this.transferRepo.findByTransferId(transferId)
    if (!entity) {
      throw new UniLinkException(
        UniLinkErrorCode.TRANSFER_NOT_FOUND,
        404,
        `Transfer ${transferId} not found`,
        `ไม่พบคำขอโอนหน่วยกิต ${transferId}`,
      )
    }

    return this.toResponse(entity)
  }

  /**
   * Approve a pending transfer request.
   *
   * 1. Validates transfer exists and is pending
   * 2. Issues a CreditTransferCredential VC
   * 3. Updates transfer status to 'approved'
   */
  async approveTransfer(
    transferId: string,
    reviewedBy: string,
    reviewNote?: string,
  ): Promise<TransferResponse> {
    // 1. Find transfer and check status
    const entity = await this.transferRepo.findByTransferId(transferId)
    if (!entity) {
      throw new UniLinkException(
        UniLinkErrorCode.TRANSFER_NOT_FOUND,
        404,
        `Transfer ${transferId} not found`,
        `ไม่พบคำขอโอนหน่วยกิต ${transferId}`,
      )
    }

    if (entity.status !== 'pending') {
      throw new UniLinkException(
        UniLinkErrorCode.TRANSFER_ALREADY_PROCESSED,
        409,
        `Transfer ${transferId} has already been ${entity.status}`,
        `คำขอโอนหน่วยกิต ${transferId} ได้รับการดำเนินการแล้ว (${entity.status})`,
      )
    }

    // 2. Extract source VC data for issuing CreditTransferCredential
    const sourceVc = await this.vcRepo.findByVcId(entity.sourceVcId)
    if (!sourceVc) {
      throw new UniLinkException(
        UniLinkErrorCode.VC_NOT_FOUND,
        404,
        `Source VC ${entity.sourceVcId} no longer exists`,
        `VC ต้นทาง ${entity.sourceVcId} ไม่พบแล้ว`,
      )
    }

    const vcDoc = sourceVc.vcDocument as Record<string, unknown>
    const subject = vcDoc.credentialSubject as Record<string, unknown>

    // 3. Issue CreditTransferCredential
    const vcIdOverride = `vc-transfer-${entity.transferId}`
    const vcResult = await this.vcService.issueVC(
      {
        studentId: entity.studentId,
        vcType: 'CreditTransferCredential',
        courseId: entity.sourceCourse,
        grade: (subject.grade as string) ?? 'A',
        gradePoint: (subject.gradePoint as number) ?? 4.0,
        semester: (subject.semester as string) ?? '1',
        academicYear: (subject.academicYear as string) ?? '2567',
      },
      { vcIdOverride },
    )

    // 4. Update transfer status
    const updated = await this.transferRepo.updateStatus(transferId, 'approved', {
      reviewedBy,
      reviewNote: reviewNote ?? null,
      transferVcId: vcResult.vcId,
      reviewedAt: new Date(),
    })

    this.logger.log(
      `Transfer approved: ${transferId} — VC issued: ${vcResult.vcId}`,
    )

    return this.toResponse(updated)
  }

  /**
   * Reject a pending transfer request.
   */
  async rejectTransfer(
    transferId: string,
    reviewedBy: string,
    reviewNote?: string,
  ): Promise<TransferResponse> {
    const entity = await this.transferRepo.findByTransferId(transferId)
    if (!entity) {
      throw new UniLinkException(
        UniLinkErrorCode.TRANSFER_NOT_FOUND,
        404,
        `Transfer ${transferId} not found`,
        `ไม่พบคำขอโอนหน่วยกิต ${transferId}`,
      )
    }

    if (entity.status !== 'pending') {
      throw new UniLinkException(
        UniLinkErrorCode.TRANSFER_ALREADY_PROCESSED,
        409,
        `Transfer ${transferId} has already been ${entity.status}`,
        `คำขอโอนหน่วยกิต ${transferId} ได้รับการดำเนินการแล้ว (${entity.status})`,
      )
    }

    const updated = await this.transferRepo.updateStatus(transferId, 'rejected', {
      reviewedBy,
      reviewNote: reviewNote ?? null,
      reviewedAt: new Date(),
    })

    this.logger.log(`Transfer rejected: ${transferId} — reason: ${reviewNote}`)

    return this.toResponse(updated)
  }

  /**
   * Convert entity to API response format.
   */
  private toResponse(entity: CreditTransferEntity): TransferResponse {
    return {
      id: entity.id,
      transferId: entity.transferId,
      studentId: entity.studentId,
      sourceVcId: entity.sourceVcId,
      sourceCourse: entity.sourceCourse,
      targetNode: entity.targetNode,
      targetCourse: entity.targetCourse ?? undefined,
      status: entity.status as 'pending' | 'approved' | 'rejected',
      reviewedBy: entity.reviewedBy ?? undefined,
      reviewNote: entity.reviewNote ?? undefined,
      transferVcId: entity.transferVcId ?? undefined,
      requestedAt: entity.requestedAt.toISOString(),
      reviewedAt: entity.reviewedAt?.toISOString(),
    }
  }
}
