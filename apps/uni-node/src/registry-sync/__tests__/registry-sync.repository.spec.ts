import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { RegistrySyncRepository } from '../registry-sync.repository'
import { IssuedVcEntity } from '../../vc/issued-vc.entity'
import { CourseOfferingEntity } from '../../course/entities/course-offering.entity'
import { SyncLogEntity } from '../sync-log.entity'

// Mock packages to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

describe('RegistrySyncRepository', () => {
  let repository: RegistrySyncRepository

  // QueryBuilder mock factory
  const createMockQueryBuilder = (
    rawResult: unknown[] = [],
    countResult?: [unknown[], number],
  ) => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawResult),
    getManyAndCount: jest.fn().mockResolvedValue(
      countResult ?? [rawResult, rawResult.length],
    ),
  })

  let mockOfferingQB = createMockQueryBuilder()
  let mockVcQB = createMockQueryBuilder()
  let mockSyncLogQB = createMockQueryBuilder()

  const mockOfferingRepo = {
    createQueryBuilder: jest.fn().mockImplementation(() => mockOfferingQB),
  }

  const mockVcRepo = {
    createQueryBuilder: jest.fn().mockImplementation(() => mockVcQB),
  }

  const mockSyncLogRepo = {
    createQueryBuilder: jest.fn().mockImplementation(() => mockSyncLogQB),
    findOne: jest.fn(),
  }

  const mockManager = {
    create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => ({
      id: 'new-sync-log-uuid',
      ...data as Record<string, unknown>,
    })),
    save: jest.fn().mockImplementation((entity: unknown) =>
      Promise.resolve(entity),
    ),
    findOneOrFail: jest.fn(),
  }

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(
      (cb: (manager: typeof mockManager) => Promise<unknown>) =>
        cb(mockManager),
    ),
  }

  const params = { academicYear: '2569', semester: '1' }

  beforeEach(async () => {
    jest.clearAllMocks()

    // Reset query builders
    mockOfferingQB = createMockQueryBuilder()
    mockVcQB = createMockQueryBuilder()
    mockSyncLogQB = createMockQueryBuilder()

    mockOfferingRepo.createQueryBuilder.mockImplementation(() => mockOfferingQB)
    mockVcRepo.createQueryBuilder.mockImplementation(() => mockVcQB)
    mockSyncLogRepo.createQueryBuilder.mockImplementation(() => mockSyncLogQB)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrySyncRepository,
        {
          provide: getRepositoryToken(IssuedVcEntity),
          useValue: mockVcRepo,
        },
        {
          provide: getRepositoryToken(CourseOfferingEntity),
          useValue: mockOfferingRepo,
        },
        {
          provide: getRepositoryToken(SyncLogEntity),
          useValue: mockSyncLogRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile()

    repository = module.get<RegistrySyncRepository>(RegistrySyncRepository)
  })

  // ─── getEnrollmentStats ────────────────────────────────────

  describe('getEnrollmentStats', () => {
    it('should query course_offerings with correct filters', async () => {
      mockOfferingQB.getRawMany.mockResolvedValue([])

      await repository.getEnrollmentStats(params)

      expect(mockOfferingRepo.createQueryBuilder).toHaveBeenCalledWith('o')
      expect(mockOfferingQB.select).toHaveBeenCalledWith('o.courseId', 'courseId')
      expect(mockOfferingQB.addSelect).toHaveBeenCalledWith(
        'SUM(o.enrolledCount)',
        'totalEnrolled',
      )
      expect(mockOfferingQB.where).toHaveBeenCalledWith(
        'o.academicYear = :year',
        { year: '2569' },
      )
      expect(mockOfferingQB.andWhere).toHaveBeenCalledWith(
        'o.semester = :semester',
        { semester: '1' },
      )
      expect(mockOfferingQB.groupBy).toHaveBeenCalledWith('o.courseId')
    })

    it('should return Map with parsed enrollment counts', async () => {
      mockOfferingQB.getRawMany.mockResolvedValue([
        { courseId: 'CS101', totalEnrolled: '150' },
        { courseId: 'CS201', totalEnrolled: '80' },
      ])

      const result = await repository.getEnrollmentStats(params)

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(2)
      expect(result.get('CS101')).toBe(150)
      expect(result.get('CS201')).toBe(80)
    })

    it('should return empty Map when no offerings found', async () => {
      mockOfferingQB.getRawMany.mockResolvedValue([])

      const result = await repository.getEnrollmentStats(params)

      expect(result.size).toBe(0)
    })

    it('should handle null totalEnrolled as 0', async () => {
      mockOfferingQB.getRawMany.mockResolvedValue([
        { courseId: 'CS101', totalEnrolled: null },
      ])

      const result = await repository.getEnrollmentStats(params)

      expect(result.get('CS101')).toBe(0)
    })
  })

  // ─── getVCStats ────────────────────────────────────────────

  describe('getVCStats', () => {
    it('should query issued_vcs with correct JSONB filters', async () => {
      mockVcQB.getRawMany.mockResolvedValue([])

      await repository.getVCStats(params)

      expect(mockVcRepo.createQueryBuilder).toHaveBeenCalledWith('vc')
      expect(mockVcQB.where).toHaveBeenCalledWith(
        'vc.vcType = :vcType',
        { vcType: 'CourseCreditCredential' },
      )
      expect(mockVcQB.andWhere).toHaveBeenCalledWith(
        'vc.status = :status',
        { status: 'active' },
      )
      expect(mockVcQB.andWhere).toHaveBeenCalledWith('vc.courseId IS NOT NULL')
      expect(mockVcQB.andWhere).toHaveBeenCalledWith(
        "vc.vcDocument->'credentialSubject'->>'academicYear' = :year",
        { year: '2569' },
      )
      expect(mockVcQB.andWhere).toHaveBeenCalledWith(
        "vc.vcDocument->'credentialSubject'->>'semester' = :semester",
        { semester: '1' },
      )
      expect(mockVcQB.groupBy).toHaveBeenCalledWith('vc.courseId')
    })

    it('should return Map with parsed passedCount and avgGradePoint', async () => {
      mockVcQB.getRawMany.mockResolvedValue([
        { courseId: 'CS101', passedCount: '120', avgGradePoint: '3.456' },
        { courseId: 'CS201', passedCount: '65', avgGradePoint: '2.95' },
      ])

      const result = await repository.getVCStats(params)

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(2)
      expect(result.get('CS101')?.passedCount).toBe(120)
      expect(result.get('CS101')?.avgGradePoint).toBe(3.46) // rounded to 2 decimals
      expect(result.get('CS201')?.passedCount).toBe(65)
      expect(result.get('CS201')?.avgGradePoint).toBe(2.95)
    })

    it('should return empty Map when no VCs found', async () => {
      mockVcQB.getRawMany.mockResolvedValue([])

      const result = await repository.getVCStats(params)

      expect(result.size).toBe(0)
    })

    it('should handle null avgGradePoint as 0', async () => {
      mockVcQB.getRawMany.mockResolvedValue([
        { courseId: 'CS101', passedCount: '10', avgGradePoint: null },
      ])

      const result = await repository.getVCStats(params)

      expect(result.get('CS101')?.avgGradePoint).toBe(0)
    })
  })

  // ─── buildAggregateStats ───────────────────────────────────

  describe('buildAggregateStats', () => {
    it('should combine enrollment and VC stats', async () => {
      mockOfferingQB.getRawMany.mockResolvedValue([
        { courseId: 'CS101', totalEnrolled: '150' },
        { courseId: 'CS201', totalEnrolled: '80' },
      ])
      mockVcQB.getRawMany.mockResolvedValue([
        { courseId: 'CS101', passedCount: '120', avgGradePoint: '3.25' },
        { courseId: 'CS201', passedCount: '65', avgGradePoint: '2.95' },
      ])

      const result = await repository.buildAggregateStats(params)

      expect(result).toHaveLength(2)

      const cs101 = result.find((s) => s.courseId === 'CS101')
      expect(cs101?.enrolledCount).toBe(150)
      expect(cs101?.passedCount).toBe(120)
      expect(cs101?.avgGradePoint).toBe(3.25)

      const cs201 = result.find((s) => s.courseId === 'CS201')
      expect(cs201?.enrolledCount).toBe(80)
      expect(cs201?.passedCount).toBe(65)
    })

    it('should include courses with only enrollment data', async () => {
      mockOfferingQB.getRawMany.mockResolvedValue([
        { courseId: 'CS301', totalEnrolled: '50' },
      ])
      mockVcQB.getRawMany.mockResolvedValue([])

      const result = await repository.buildAggregateStats(params)

      expect(result).toHaveLength(1)
      expect(result[0].courseId).toBe('CS301')
      expect(result[0].enrolledCount).toBe(50)
      expect(result[0].passedCount).toBe(0)
      expect(result[0].avgGradePoint).toBe(0)
    })

    it('should include courses with only VC data', async () => {
      mockOfferingQB.getRawMany.mockResolvedValue([])
      mockVcQB.getRawMany.mockResolvedValue([
        { courseId: 'CS401', passedCount: '30', avgGradePoint: '3.5' },
      ])

      const result = await repository.buildAggregateStats(params)

      expect(result).toHaveLength(1)
      expect(result[0].courseId).toBe('CS401')
      expect(result[0].enrolledCount).toBe(0)
      expect(result[0].passedCount).toBe(30)
    })

    it('should exclude courses with zero enrollment AND zero passed', async () => {
      mockOfferingQB.getRawMany.mockResolvedValue([
        { courseId: 'CS501', totalEnrolled: '0' },
      ])
      mockVcQB.getRawMany.mockResolvedValue([])

      const result = await repository.buildAggregateStats(params)

      expect(result).toHaveLength(0)
    })

    it('should return empty array when both sources are empty', async () => {
      mockOfferingQB.getRawMany.mockResolvedValue([])
      mockVcQB.getRawMany.mockResolvedValue([])

      const result = await repository.buildAggregateStats(params)

      expect(result).toHaveLength(0)
    })
  })

  // ─── createSyncLog ─────────────────────────────────────────

  describe('createSyncLog', () => {
    it('should create sync log within a transaction', async () => {
      const data = {
        syncType: 'aggregate',
        status: 'running',
        nodeId: 'tu.ac.th',
        startedAt: new Date(),
      }

      const result = await repository.createSyncLog(data)

      expect(mockDataSource.transaction).toHaveBeenCalled()
      expect(mockManager.create).toHaveBeenCalledWith(SyncLogEntity, data)
      expect(mockManager.save).toHaveBeenCalled()
      expect(result.syncType).toBe('aggregate')
    })

    it('should return created entity with generated id', async () => {
      const result = await repository.createSyncLog({
        syncType: 'aggregate',
        status: 'running',
        nodeId: 'tu.ac.th',
        startedAt: new Date(),
      })

      expect(result.id).toBe('new-sync-log-uuid')
    })
  })

  // ─── updateSyncLog ─────────────────────────────────────────

  describe('updateSyncLog', () => {
    it('should find and update sync log within a transaction', async () => {
      const existingLog = {
        id: 'existing-uuid',
        syncType: 'aggregate',
        status: 'running',
        nodeId: 'tu.ac.th',
      }
      mockManager.findOneOrFail.mockResolvedValue({ ...existingLog })

      const result = await repository.updateSyncLog('existing-uuid', {
        status: 'success',
        courseCount: 10,
      })

      expect(mockDataSource.transaction).toHaveBeenCalled()
      expect(mockManager.findOneOrFail).toHaveBeenCalledWith(SyncLogEntity, {
        where: { id: 'existing-uuid' },
      })
      expect(result.status).toBe('success')
      expect((result as unknown as Record<string, unknown>).courseCount).toBe(10)
    })

    it('should throw when sync log not found', async () => {
      mockManager.findOneOrFail.mockRejectedValue(
        new Error('Entity not found'),
      )

      await expect(
        repository.updateSyncLog('nonexistent-uuid', { status: 'success' }),
      ).rejects.toThrow('Entity not found')
    })
  })

  // ─── findSyncLogs ──────────────────────────────────────────

  describe('findSyncLogs', () => {
    const mockLogs = [
      {
        id: 'log-1',
        syncType: 'aggregate',
        status: 'success',
        startedAt: new Date(),
      },
    ]

    it('should return paginated results', async () => {
      mockSyncLogQB.getManyAndCount.mockResolvedValue([mockLogs, 1])

      const result = await repository.findSyncLogs({ page: 1, limit: 10 })

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(mockSyncLogQB.orderBy).toHaveBeenCalledWith(
        'log.startedAt',
        'DESC',
      )
      expect(mockSyncLogQB.skip).toHaveBeenCalledWith(0)
      expect(mockSyncLogQB.take).toHaveBeenCalledWith(10)
    })

    it('should filter by syncType when provided', async () => {
      mockSyncLogQB.getManyAndCount.mockResolvedValue([[], 0])

      await repository.findSyncLogs({ syncType: 'aggregate' })

      expect(mockSyncLogQB.andWhere).toHaveBeenCalledWith(
        'log.syncType = :syncType',
        { syncType: 'aggregate' },
      )
    })

    it('should filter by status when provided', async () => {
      mockSyncLogQB.getManyAndCount.mockResolvedValue([[], 0])

      await repository.findSyncLogs({ status: 'failed' })

      expect(mockSyncLogQB.andWhere).toHaveBeenCalledWith(
        'log.status = :status',
        { status: 'failed' },
      )
    })

    it('should use defaults page=1 and limit=20', async () => {
      mockSyncLogQB.getManyAndCount.mockResolvedValue([[], 0])

      await repository.findSyncLogs()

      expect(mockSyncLogQB.skip).toHaveBeenCalledWith(0)
      expect(mockSyncLogQB.take).toHaveBeenCalledWith(20)
    })
  })

  // ─── findLastSuccessfulSync ────────────────────────────────

  describe('findLastSuccessfulSync', () => {
    it('should query for last successful sync by type', async () => {
      const mockLog = {
        id: 'log-1',
        syncType: 'aggregate',
        status: 'success',
        completedAt: new Date(),
      }
      mockSyncLogRepo.findOne.mockResolvedValue(mockLog)

      const result = await repository.findLastSuccessfulSync('aggregate')

      expect(mockSyncLogRepo.findOne).toHaveBeenCalledWith({
        where: { syncType: 'aggregate', status: 'success' },
        order: { startedAt: 'DESC' },
      })
      expect(result?.id).toBe('log-1')
    })

    it('should return null when no successful sync exists', async () => {
      mockSyncLogRepo.findOne.mockResolvedValue(null)

      const result = await repository.findLastSuccessfulSync('aggregate')

      expect(result).toBeNull()
    })
  })
})
