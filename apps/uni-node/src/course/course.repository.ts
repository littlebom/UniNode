import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Brackets } from 'typeorm'
import { CourseEntity } from './entities/course.entity'
import { CourseOutcomeEntity } from './entities/course-outcome.entity'
import { CourseSyllabusEntity } from './entities/course-syllabus.entity'
import { CourseAssessmentEntity } from './entities/course-assessment.entity'

export interface CourseFilterOptions {
  faculty?: string
  deliveryMode?: string
  credits?: number
  isActive?: boolean
  page?: number
  limit?: number
}

@Injectable()
export class CourseRepository {
  constructor(
    @InjectRepository(CourseEntity)
    private readonly courseRepo: Repository<CourseEntity>,
    @InjectRepository(CourseOutcomeEntity)
    private readonly outcomeRepo: Repository<CourseOutcomeEntity>,
    @InjectRepository(CourseSyllabusEntity)
    private readonly syllabusRepo: Repository<CourseSyllabusEntity>,
    @InjectRepository(CourseAssessmentEntity)
    private readonly assessmentRepo: Repository<CourseAssessmentEntity>,
  ) {}

  async findAll(
    options?: CourseFilterOptions,
  ): Promise<{ data: CourseEntity[]; total: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    const skip = (page - 1) * limit

    const qb = this.courseRepo.createQueryBuilder('course')

    if (options?.faculty) {
      qb.andWhere('course.faculty = :faculty', { faculty: options.faculty })
    }

    if (options?.deliveryMode) {
      qb.andWhere('course.deliveryMode = :deliveryMode', {
        deliveryMode: options.deliveryMode,
      })
    }

    if (options?.credits !== undefined) {
      qb.andWhere('course.credits = :credits', { credits: options.credits })
    }

    if (options?.isActive !== undefined) {
      qb.andWhere('course.isActive = :isActive', { isActive: options.isActive })
    }

    qb.orderBy('course.courseId', 'ASC').skip(skip).take(limit)

    const [data, total] = await qb.getManyAndCount()
    return { data, total }
  }

  async findByCourseId(courseId: string): Promise<CourseEntity | null> {
    return this.courseRepo.findOne({ where: { courseId } })
  }

  async search(
    q: string,
    options?: CourseFilterOptions,
  ): Promise<{ data: CourseEntity[]; total: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    const skip = (page - 1) * limit

    const qb = this.courseRepo
      .createQueryBuilder('course')
      .where('course.isActive = :active', { active: true })
      .andWhere(
        new Brackets((sub) => {
          sub
            .where('course.courseId ILIKE :q', { q: `%${q}%` })
            .orWhere('course.courseName ILIKE :q', { q: `%${q}%` })
            .orWhere('course.courseNameTH ILIKE :q', { q: `%${q}%` })
            .orWhere('course.description ILIKE :q', { q: `%${q}%` })
        }),
      )

    if (options?.faculty) {
      qb.andWhere('course.faculty = :faculty', { faculty: options.faculty })
    }

    if (options?.credits !== undefined) {
      qb.andWhere('course.credits = :credits', { credits: options.credits })
    }

    qb.orderBy('course.courseId', 'ASC').skip(skip).take(limit)

    const [data, total] = await qb.getManyAndCount()
    return { data, total }
  }

  async getOutcomesByCourseId(courseId: string): Promise<CourseOutcomeEntity[]> {
    return this.outcomeRepo.find({
      where: { courseId },
      order: { sortOrder: 'ASC' },
    })
  }

  async getSyllabusByCourseId(courseId: string): Promise<CourseSyllabusEntity[]> {
    return this.syllabusRepo.find({
      where: { courseId },
      order: { week: 'ASC' },
    })
  }

  async getAssessmentsByCourseId(courseId: string): Promise<CourseAssessmentEntity[]> {
    return this.assessmentRepo.find({
      where: { courseId },
    })
  }
}
