import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { StatusListEntity } from './status-list.entity'

@Injectable()
export class StatusListRepository {
  constructor(
    @InjectRepository(StatusListEntity)
    private readonly repo: Repository<StatusListEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findByListId(listId: string): Promise<StatusListEntity | null> {
    return this.repo.findOne({ where: { listId } })
  }

  async create(data: Partial<StatusListEntity>): Promise<StatusListEntity> {
    return this.dataSource.transaction(async (manager) => {
      const entity = manager.create(StatusListEntity, data)
      return manager.save(entity)
    })
  }

  async updateEncodedList(
    listId: string,
    encodedList: string,
    nextIndex?: number,
  ): Promise<StatusListEntity> {
    return this.dataSource.transaction(async (manager) => {
      const updateData: Partial<StatusListEntity> = { encodedList }
      if (nextIndex !== undefined) {
        updateData.nextIndex = nextIndex
      }
      await manager.update(StatusListEntity, { listId }, updateData)
      const updated = await manager.findOne(StatusListEntity, { where: { listId } })
      if (!updated) {
        throw new Error(`StatusList with listId ${listId} not found after update`)
      }
      return updated
    })
  }

  async incrementNextIndex(listId: string): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const entity = await manager.findOne(StatusListEntity, {
        where: { listId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!entity) {
        throw new Error(`StatusList with listId ${listId} not found`)
      }
      const index = entity.nextIndex
      entity.nextIndex = index + 1
      await manager.save(entity)
      return index
    })
  }
}
