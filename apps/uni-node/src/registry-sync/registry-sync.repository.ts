import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { IssuedVcEntity } from '../vc/issued-vc.entity'
import { CourseOfferingEntity } from '../course/entities/course-offering.entity'
import { SyncLogEntity } from './sync-log.entity'
import type { AggregateCourseStat } from '@unilink/dto'

export interface AggregateQueryParams {
  academicYear: string
  semester: string
}

@Injectable()
export class RegistrySyncRepository {
  private readonly logger = new Logger(RegistrySyncRepository.name)

  constructor(
    @InjectRepository(IssuedVcEntity)
    private readonly vcRepo: Repository<IssuedVcEntity>,
    @InjectRepository(CourseOfferingEntity)
    private readonly offeringRepo: Repository<CourseOfferingEntity>,
    @InjectRepository(SyncLogEntity)
    private readonly syncLogRepo: Repository<SyncLogEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Aggregate enrollment data from course_offerings
   * grouped by courseId for a given academicYear + semester
   */
  async getEnrollmentStats(
    params: AggregateQueryParams,
  ): Promise<Map<string, number>> {
    const result = await this.offeringRepo
      .createQueryBuilder('o')
      .select('o.courseId', 'courseId')
      .addSelect('SUM(o.enrolledCount)', 'totalEnrolled')
      .where('o.academicYear = :year', { year: params.academicYear })
      .andWhere('o.semester = :semester', { semester: params.semester })
      .andWhere('o.status = :status', { status: 'active' })
      .groupBy('o.courseId')
      .getRawMany<{ courseId: string; totalEnrolled: string }>()

    const map = new Map<string, number>()
    for (const row of result) {
      map.set(row.courseId, parseInt(row.totalEnrolled, 10) || 0)
    }
    return map
  }

  /**
   * Aggregate VC stats: count of passed students and average gradePoint
   * per courseId for a given academicYear + semester.
   *
   * A VC with status='active' and vcType='CourseCreditCredential' means the student passed.
   * gradePoint is extracted from vcDocument -> 'credentialSubject' -> 'gradePoint'.
   */
  async getVCStats(
    params: AggregateQueryParams,
  ): Promise<
    Map<string, { passedCount: number; avgGradePoint: number }>
  > {
    const result = await this.vcRepo
      .createQueryBuilder('vc')
      .select('vc.courseId', 'courseId')
      .addSelect('COUNT(vc.id)', 'passedCount')
      .addSelect(
        "AVG(COALESCE((\"vc\".\"vc_document\"->'credentialSubject'->>'gradePoint')::numeric, 0))",
        'avgGradePoint',
      )
      .where('vc.vcType = :vcType', { vcType: 'CourseCreditCredential' })
      .andWhere('vc.status = :status', { status: 'active' })
      .andWhere('vc.courseId IS NOT NULL')
      .andWhere(
        "\"vc\".\"vc_document\"->'credentialSubject'->>'academicYear' = :year",
        { year: params.academicYear },
      )
      .andWhere(
        "\"vc\".\"vc_document\"->'credentialSubject'->>'semester' = :semester",
        { semester: params.semester },
      )
      .groupBy('vc.courseId')
      .getRawMany<{
        courseId: string
        passedCount: string
        avgGradePoint: string
      }>()

    const map = new Map<string, { passedCount: number; avgGradePoint: number }>()
    for (const row of result) {
      map.set(row.courseId, {
        passedCount: parseInt(row.passedCount, 10) || 0,
        avgGradePoint: parseFloat(
          parseFloat(row.avgGradePoint || '0').toFixed(2),
        ),
      })
    }
    return map
  }

  /**
   * Combine enrollment + VC stats into AggregateCourseStat[]
   */
  async buildAggregateStats(
    params: AggregateQueryParams,
  ): Promise<AggregateCourseStat[]> {
    const [enrollmentMap, vcStatsMap] = await Promise.all([
      this.getEnrollmentStats(params),
      this.getVCStats(params),
    ])

    // Merge all unique courseIds from both maps
    const allCourseIds = new Set([
      ...enrollmentMap.keys(),
      ...vcStatsMap.keys(),
    ])

    const stats: AggregateCourseStat[] = []
    for (const courseId of allCourseIds) {
      const enrolledCount = enrollmentMap.get(courseId) ?? 0
      const vcStats = vcStatsMap.get(courseId) ?? {
        passedCount: 0,
        avgGradePoint: 0,
      }

      // Only include courses that have at least some data
      if (enrolledCount > 0 || vcStats.passedCount > 0) {
        stats.push({
          courseId,
          enrolledCount,
          passedCount: vcStats.passedCount,
          avgGradePoint: vcStats.avgGradePoint,
        })
      }
    }

    this.logger.debug(
      `Built aggregate stats: ${stats.length} courses for ${params.academicYear}/${params.semester}`,
    )

    return stats
  }

  // ── Sync Log Operations ──────────────────────────────────

  async createSyncLog(data: Partial<SyncLogEntity>): Promise<SyncLogEntity> {
    return this.dataSource.transaction(async (manager) => {
      const entity = manager.create(SyncLogEntity, data)
      return manager.save(entity)
    })
  }

  async updateSyncLog(
    id: string,
    data: Partial<SyncLogEntity>,
  ): Promise<SyncLogEntity> {
    return this.dataSource.transaction(async (manager) => {
      const entity = await manager.findOneOrFail(SyncLogEntity, {
        where: { id },
      })
      Object.assign(entity, data)
      return manager.save(entity)
    })
  }

  async findSyncLogs(options?: {
    syncType?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: SyncLogEntity[]; total: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    const skip = (page - 1) * limit

    const qb = this.syncLogRepo
      .createQueryBuilder('log')
      .orderBy('log.startedAt', 'DESC')

    if (options?.syncType) {
      qb.andWhere('log.syncType = :syncType', {
        syncType: options.syncType,
      })
    }

    if (options?.status) {
      qb.andWhere('log.status = :status', { status: options.status })
    }

    qb.skip(skip).take(limit)

    const [data, total] = await qb.getManyAndCount()
    return { data, total }
  }

  async findLastSuccessfulSync(
    syncType: string,
  ): Promise<SyncLogEntity | null> {
    return this.syncLogRepo.findOne({
      where: { syncType, status: 'success' },
      order: { startedAt: 'DESC' },
    })
  }
}
