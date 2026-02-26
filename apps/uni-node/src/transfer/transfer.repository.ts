import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { CreditTransferEntity } from './credit-transfer.entity'

@Injectable()
export class TransferRepository {
  constructor(
    @InjectRepository(CreditTransferEntity)
    private readonly repo: Repository<CreditTransferEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findByTransferId(transferId: string): Promise<CreditTransferEntity | null> {
    return this.repo.findOne({ where: { transferId } })
  }

  async findByStudentId(
    studentId: string,
    options?: { page?: number; limit?: number; status?: string },
  ): Promise<{ data: CreditTransferEntity[]; total: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    const skip = (page - 1) * limit

    const qb = this.repo.createQueryBuilder('transfer')
      .where('transfer.studentId = :studentId', { studentId })

    if (options?.status) {
      qb.andWhere('transfer.status = :status', { status: options.status })
    }

    qb.orderBy('transfer.createdAt', 'DESC')
      .skip(skip)
      .take(limit)

    const [data, total] = await qb.getManyAndCount()
    return { data, total }
  }

  async create(data: Partial<CreditTransferEntity>): Promise<CreditTransferEntity> {
    return this.dataSource.transaction(async (manager) => {
      const entity = manager.create(CreditTransferEntity, data)
      return manager.save(entity)
    })
  }

  async updateStatus(
    transferId: string,
    status: string,
    data?: Partial<Pick<CreditTransferEntity, 'reviewedBy' | 'reviewNote' | 'transferVcId' | 'reviewedAt'>>,
  ): Promise<CreditTransferEntity> {
    return this.dataSource.transaction(async (manager) => {
      const entity = await manager.findOne(CreditTransferEntity, {
        where: { transferId },
      })
      if (!entity) {
        throw new Error(`Transfer with transferId ${transferId} not found`)
      }
      entity.status = status
      if (data?.reviewedBy !== undefined) entity.reviewedBy = data.reviewedBy
      if (data?.reviewNote !== undefined) entity.reviewNote = data.reviewNote
      if (data?.transferVcId !== undefined) entity.transferVcId = data.transferVcId
      if (data?.reviewedAt !== undefined) entity.reviewedAt = data.reviewedAt
      return manager.save(entity)
    })
  }

  async existsBySourceVcAndTarget(
    sourceVcId: string,
    targetNode: string,
  ): Promise<boolean> {
    const count = await this.repo
      .createQueryBuilder('transfer')
      .where('transfer.sourceVcId = :sourceVcId', { sourceVcId })
      .andWhere('transfer.targetNode = :targetNode', { targetNode })
      .andWhere('transfer.status IN (:...statuses)', { statuses: ['pending', 'approved'] })
      .getCount()
    return count > 0
  }
}
