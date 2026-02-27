import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { StudentEntity } from './student.entity'

@Injectable()
export class StudentRepository {
  constructor(
    @InjectRepository(StudentEntity)
    private readonly repo: Repository<StudentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(options?: {
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: StudentEntity[]; total: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    const skip = (page - 1) * limit

    const qb = this.repo.createQueryBuilder('student')

    if (options?.status) {
      qb.where('student.status = :status', { status: options.status })
    }

    qb.orderBy('student.createdAt', 'DESC')
      .skip(skip)
      .take(limit)

    const [data, total] = await qb.getManyAndCount()
    return { data, total }
  }

  async findByStudentId(studentId: string): Promise<StudentEntity | null> {
    return this.repo.findOne({ where: { studentId } })
  }

  async findByDid(did: string): Promise<StudentEntity | null> {
    return this.repo.findOne({ where: { did } })
  }

  async findById(id: string): Promise<StudentEntity | null> {
    return this.repo.findOne({ where: { id } })
  }

  async findByDidUuid(didUuid: string): Promise<StudentEntity | null> {
    return this.repo.findOne({ where: { didUuid } })
  }

  async findByDidWeb(didWeb: string): Promise<StudentEntity | null> {
    return this.repo.findOne({ where: { didWeb } })
  }

  async create(data: Partial<StudentEntity>): Promise<StudentEntity> {
    return this.dataSource.transaction(async (manager) => {
      const student = manager.create(StudentEntity, data)
      return manager.save(student)
    })
  }

  async update(studentId: string, data: Partial<StudentEntity>): Promise<StudentEntity> {
    return this.dataSource.transaction(async (manager) => {
      await manager.update(StudentEntity, { studentId }, data)
      const updated = await manager.findOne(StudentEntity, { where: { studentId } })
      if (!updated) {
        throw new Error(`Student with studentId ${studentId} not found after update`)
      }
      return updated
    })
  }

  async existsByStudentId(studentId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { studentId } })
    return count > 0
  }
}
