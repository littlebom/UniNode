import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource, Like } from 'typeorm'
import { IssuedVcEntity } from './issued-vc.entity'

@Injectable()
export class VCRepository {
  constructor(
    @InjectRepository(IssuedVcEntity)
    private readonly repo: Repository<IssuedVcEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findByVcId(vcId: string): Promise<IssuedVcEntity | null> {
    return this.repo.findOne({ where: { vcId } })
  }

  async findByStudentId(
    studentId: string,
    options?: { page?: number; limit?: number; status?: string },
  ): Promise<{ data: IssuedVcEntity[]; total: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    const skip = (page - 1) * limit

    const qb = this.repo.createQueryBuilder('vc')
      .where('vc.studentId = :studentId', { studentId })

    if (options?.status) {
      qb.andWhere('vc.status = :status', { status: options.status })
    }

    qb.orderBy('vc.createdAt', 'DESC')
      .skip(skip)
      .take(limit)

    const [data, total] = await qb.getManyAndCount()
    return { data, total }
  }

  async create(data: Partial<IssuedVcEntity>): Promise<IssuedVcEntity> {
    return this.dataSource.transaction(async (manager) => {
      const vc = manager.create(IssuedVcEntity, data)
      return manager.save(vc)
    })
  }

  async updateStatus(
    vcId: string,
    status: string,
    revokeReason?: string,
  ): Promise<IssuedVcEntity> {
    return this.dataSource.transaction(async (manager) => {
      const entity = await manager.findOne(IssuedVcEntity, { where: { vcId } })
      if (!entity) {
        throw new Error(`VC with vcId ${vcId} not found`)
      }
      entity.status = status
      if (status === 'revoked') {
        entity.revokedAt = new Date()
        entity.revokeReason = revokeReason ?? null
      }
      return manager.save(entity)
    })
  }

  async existsByVcId(vcId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { vcId } })
    return count > 0
  }

  /**
   * Count VCs matching a base ID or versioned IDs (e.g., baseId-v2, baseId-v3).
   * Optimized: uses range scan on B-tree index instead of LIKE pattern.
   */
  async countByVcIdPrefix(prefix: string): Promise<number> {
    // Range scan: find all vcIds that start with the prefix
    // This is more efficient than LIKE with B-tree indexes
    const prefixEnd = prefix.slice(0, -1) + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1)

    return this.repo
      .createQueryBuilder('vc')
      .where('vc.vcId >= :prefix AND vc.vcId < :prefixEnd', { prefix, prefixEnd })
      .getCount()
  }
}
