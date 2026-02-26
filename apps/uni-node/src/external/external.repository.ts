import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { ExternalCredentialEntity } from './external-credential.entity'

@Injectable()
export class ExternalRepository {
  constructor(
    @InjectRepository(ExternalCredentialEntity)
    private readonly repo: Repository<ExternalCredentialEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Find all external credential requests with optional filters and pagination.
   */
  async findAll(
    params?: { page?: number; limit?: number; status?: string },
  ): Promise<{ data: ExternalCredentialEntity[]; total: number }> {
    const page = params?.page ?? 1
    const limit = params?.limit ?? 20
    const skip = (page - 1) * limit

    const qb = this.repo.createQueryBuilder('ext')

    if (params?.status) {
      qb.andWhere('ext.status = :status', { status: params.status })
    }

    qb.orderBy('ext.requestedAt', 'DESC')
      .skip(skip)
      .take(limit)

    const [data, total] = await qb.getManyAndCount()
    return { data, total }
  }

  /**
   * Find a single external credential request by its request ID.
   */
  async findByRequestId(
    requestId: string,
  ): Promise<ExternalCredentialEntity | null> {
    return this.repo.findOne({ where: { requestId } })
  }

  /**
   * Create a new external credential request within a transaction.
   */
  async create(
    data: Partial<ExternalCredentialEntity>,
  ): Promise<ExternalCredentialEntity> {
    return this.dataSource.transaction(async (manager) => {
      const entity = manager.create(ExternalCredentialEntity, data)
      return manager.save(entity)
    })
  }

  /**
   * Update the status and related fields of an external credential request.
   */
  async updateStatus(
    requestId: string,
    status: string,
    data?: Partial<
      Pick<
        ExternalCredentialEntity,
        | 'recognizedCourseId'
        | 'recognizedCredits'
        | 'reviewedBy'
        | 'reviewNote'
        | 'issuedVcId'
        | 'decidedAt'
      >
    >,
  ): Promise<ExternalCredentialEntity> {
    return this.dataSource.transaction(async (manager) => {
      const entity = await manager.findOne(ExternalCredentialEntity, {
        where: { requestId },
      })
      if (!entity) {
        throw new Error(
          `External credential request with requestId ${requestId} not found`,
        )
      }
      entity.status = status
      if (data?.recognizedCourseId !== undefined)
        entity.recognizedCourseId = data.recognizedCourseId
      if (data?.recognizedCredits !== undefined)
        entity.recognizedCredits = data.recognizedCredits
      if (data?.reviewedBy !== undefined) entity.reviewedBy = data.reviewedBy
      if (data?.reviewNote !== undefined) entity.reviewNote = data.reviewNote
      if (data?.issuedVcId !== undefined) entity.issuedVcId = data.issuedVcId
      if (data?.decidedAt !== undefined) entity.decidedAt = data.decidedAt
      return manager.save(entity)
    })
  }

  /**
   * Count total recognized credits for a student across all approved external credentials.
   * Optionally filter by academic year (based on completion_date year).
   */
  async countCreditsForStudent(
    studentId: string,
    year?: number,
  ): Promise<number> {
    const qb = this.repo
      .createQueryBuilder('ext')
      .select('COALESCE(SUM(ext.recognizedCredits), 0)', 'totalCredits')
      .where('ext.studentId = :studentId', { studentId })
      .andWhere('ext.status = :status', { status: 'approved' })

    if (year) {
      qb.andWhere('EXTRACT(YEAR FROM ext.completionDate) = :year', { year })
    }

    const result = await qb.getRawOne<{ totalCredits: string }>()
    return parseInt(result?.totalCredits ?? '0', 10)
  }
}
