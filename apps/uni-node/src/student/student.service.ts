import { Injectable, Logger } from '@nestjs/common'
import { StudentRepository } from './student.repository'
import { StudentEntity } from './student.entity'
import { QueryStudentDto } from './dto/query-student.dto'
import { UniLinkException, UniLinkErrorCode } from '@unilink/dto'

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name)

  constructor(private readonly studentRepository: StudentRepository) {}

  async findAll(query: QueryStudentDto): Promise<{
    data: StudentEntity[]
    total: number
    page: number
    limit: number
  }> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const { data, total } = await this.studentRepository.findAll({
      status: query.status,
      page,
      limit,
    })
    return { data, total, page, limit }
  }

  async findByStudentId(studentId: string): Promise<StudentEntity> {
    const student = await this.studentRepository.findByStudentId(studentId)
    if (!student) {
      throw new UniLinkException(
        UniLinkErrorCode.STUDENT_NOT_FOUND,
        404,
        `Student ${studentId} not found`,
        `ไม่พบนักศึกษา ${studentId}`,
      )
    }
    return student
  }

  async findByDid(did: string): Promise<StudentEntity> {
    const student = await this.studentRepository.findByDid(did)
    if (!student) {
      throw new UniLinkException(
        UniLinkErrorCode.STUDENT_NOT_FOUND,
        404,
        `Student with DID ${did} not found`,
        `ไม่พบนักศึกษาที่มี DID ${did}`,
      )
    }
    return student
  }

  async findByDidWeb(didWeb: string): Promise<StudentEntity> {
    const student = await this.studentRepository.findByDidWeb(didWeb)
    if (!student) {
      throw new UniLinkException(
        UniLinkErrorCode.STUDENT_NOT_FOUND,
        404,
        `Student with DID ${didWeb} not found`,
        `ไม่พบนักศึกษาที่มี DID ${didWeb}`,
      )
    }
    return student
  }

  async create(data: {
    studentId: string
    did?: string
    didUuid?: string
    didWeb?: string
    publicKey?: string
    walletEndpoint?: string
    fcmToken?: string
  }): Promise<StudentEntity> {
    const exists = await this.studentRepository.existsByStudentId(data.studentId)
    if (exists) {
      throw new UniLinkException(
        UniLinkErrorCode.STUDENT_ALREADY_EXISTS,
        409,
        `Student ${data.studentId} already exists`,
        `นักศึกษา ${data.studentId} มีอยู่แล้ว`,
      )
    }

    const student = await this.studentRepository.create({
      studentId: data.studentId,
      did: data.did ?? null,
      didUuid: data.didUuid ?? null,
      didWeb: data.didWeb ?? null,
      publicKey: data.publicKey ?? null,
      walletEndpoint: data.walletEndpoint ?? null,
      fcmToken: data.fcmToken ?? null,
      status: 'active',
    })

    this.logger.log(`Student created: ${data.studentId}`)
    return student
  }

  async update(
    studentId: string,
    data: Partial<Pick<StudentEntity, 'did' | 'didUuid' | 'didWeb' | 'walletEndpoint' | 'fcmToken' | 'status' | 'publicKey'>>,
  ): Promise<StudentEntity> {
    await this.findByStudentId(studentId) // Throws if not found

    const updated = await this.studentRepository.update(studentId, data)
    this.logger.log(`Student updated: ${studentId}`)
    return updated
  }
}
