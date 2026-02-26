import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { ExternalRepository } from '../external.repository'
import { ExternalCredentialEntity } from '../external-credential.entity'

// Mock packages to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

describe('ExternalRepository', () => {
  let repository: ExternalRepository

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
    getRawOne: jest.fn().mockResolvedValue(
      rawResult.length > 0 ? rawResult[0] : { totalCredits: '0' },
    ),
    getManyAndCount: jest.fn().mockResolvedValue(
      countResult ?? [rawResult, rawResult.length],
    ),
  })

  let mockQB = createMockQueryBuilder()

  const mockRepo = {
    createQueryBuilder: jest.fn().mockImplementation(() => mockQB),
    findOne: jest.fn(),
  }

  const mockManager = {
    create: jest.fn().mockImplementation(
      (_entity: unknown, data: unknown) => ({
        id: 'new-uuid',
        ...(data as Record<string, unknown>),
      }),
    ),
    save: jest.fn().mockImplementation((entity: unknown) =>
      Promise.resolve(entity),
    ),
    findOne: jest.fn(),
  }

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(
      (cb: (manager: typeof mockManager) => Promise<unknown>) =>
        cb(mockManager),
    ),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    mockQB = createMockQueryBuilder()
    mockRepo.createQueryBuilder.mockImplementation(() => mockQB)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalRepository,
        {
          provide: getRepositoryToken(ExternalCredentialEntity),
          useValue: mockRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile()

    repository = module.get<ExternalRepository>(ExternalRepository)
  })

  // ─── findAll ────────────────────────────────────────────

  describe('findAll', () => {
    const mockEntities = [
      {
        id: 'uuid-1',
        requestId: 'ext-1',
        studentId: '6401001',
        platform: 'Coursera',
        courseName: 'ML',
        status: 'pending',
      },
    ]

    it('should return paginated results', async () => {
      mockQB.getManyAndCount.mockResolvedValue([mockEntities, 1])

      const result = await repository.findAll({ page: 1, limit: 10 })

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(mockQB.orderBy).toHaveBeenCalledWith('ext.requestedAt', 'DESC')
      expect(mockQB.skip).toHaveBeenCalledWith(0)
      expect(mockQB.take).toHaveBeenCalledWith(10)
    })

    it('should filter by status when provided', async () => {
      mockQB.getManyAndCount.mockResolvedValue([[], 0])

      await repository.findAll({ status: 'pending' })

      expect(mockQB.andWhere).toHaveBeenCalledWith(
        'ext.status = :status',
        { status: 'pending' },
      )
    })

    it('should use defaults page=1 and limit=20', async () => {
      mockQB.getManyAndCount.mockResolvedValue([[], 0])

      await repository.findAll()

      expect(mockQB.skip).toHaveBeenCalledWith(0)
      expect(mockQB.take).toHaveBeenCalledWith(20)
    })

    it('should return empty when no results', async () => {
      mockQB.getManyAndCount.mockResolvedValue([[], 0])

      const result = await repository.findAll()

      expect(result.data).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  // ─── findByRequestId ───────────────────────────────────

  describe('findByRequestId', () => {
    it('should return entity when found', async () => {
      const mockEntity = { id: 'uuid-1', requestId: 'ext-1' }
      mockRepo.findOne.mockResolvedValue(mockEntity)

      const result = await repository.findByRequestId('ext-1')

      expect(result?.requestId).toBe('ext-1')
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { requestId: 'ext-1' },
      })
    })

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null)

      const result = await repository.findByRequestId('ext-999')

      expect(result).toBeNull()
    })
  })

  // ─── create ─────────────────────────────────────────────

  describe('create', () => {
    it('should create entity within a transaction', async () => {
      const data = {
        requestId: 'ext-new',
        studentId: '6401001',
        platform: 'Coursera',
        platformTier: 1,
        courseName: 'ML',
        institution: 'Stanford',
        completionDate: new Date('2026-01-15'),
        status: 'pending',
        requestedAt: new Date(),
      }

      const result = await repository.create(data)

      expect(mockDataSource.transaction).toHaveBeenCalled()
      expect(mockManager.create).toHaveBeenCalledWith(
        ExternalCredentialEntity,
        data,
      )
      expect(mockManager.save).toHaveBeenCalled()
      expect(result.requestId).toBe('ext-new')
    })

    it('should return created entity with generated id', async () => {
      const result = await repository.create({
        requestId: 'ext-new-2',
        studentId: '6401002',
        platform: 'edX',
        platformTier: 1,
        courseName: 'Data Science',
        institution: 'MIT',
        completionDate: new Date(),
        status: 'pending',
        requestedAt: new Date(),
      })

      expect(result.id).toBe('new-uuid')
    })
  })

  // ─── updateStatus ──────────────────────────────────────

  describe('updateStatus', () => {
    it('should find and update entity within a transaction', async () => {
      const existingEntity = {
        id: 'uuid-1',
        requestId: 'ext-1',
        status: 'pending',
        studentId: '6401001',
      }
      mockManager.findOne.mockResolvedValue({ ...existingEntity })

      const result = await repository.updateStatus('ext-1', 'approved', {
        recognizedCourseId: 'CS101',
        recognizedCredits: 3,
        reviewedBy: 'admin-did',
        decidedAt: new Date(),
      })

      expect(mockDataSource.transaction).toHaveBeenCalled()
      expect(mockManager.findOne).toHaveBeenCalledWith(
        ExternalCredentialEntity,
        { where: { requestId: 'ext-1' } },
      )
      expect(result.status).toBe('approved')
      expect((result as unknown as Record<string, unknown>).recognizedCourseId).toBe('CS101')
    })

    it('should throw when request not found', async () => {
      mockManager.findOne.mockResolvedValue(null)

      await expect(
        repository.updateStatus('ext-999', 'approved'),
      ).rejects.toThrow('not found')
    })
  })

  // ─── countCreditsForStudent ────────────────────────────

  describe('countCreditsForStudent', () => {
    it('should return sum of recognized credits', async () => {
      mockQB.getRawOne.mockResolvedValue({ totalCredits: '12' })

      const result = await repository.countCreditsForStudent('6401001')

      expect(result).toBe(12)
      expect(mockQB.where).toHaveBeenCalledWith(
        'ext.studentId = :studentId',
        { studentId: '6401001' },
      )
      expect(mockQB.andWhere).toHaveBeenCalledWith(
        'ext.status = :status',
        { status: 'approved' },
      )
    })

    it('should return 0 when no approved credits', async () => {
      mockQB.getRawOne.mockResolvedValue({ totalCredits: '0' })

      const result = await repository.countCreditsForStudent('6401002')

      expect(result).toBe(0)
    })

    it('should filter by year when provided', async () => {
      mockQB.getRawOne.mockResolvedValue({ totalCredits: '6' })

      await repository.countCreditsForStudent('6401001', 2026)

      expect(mockQB.andWhere).toHaveBeenCalledWith(
        'EXTRACT(YEAR FROM ext.completionDate) = :year',
        { year: 2026 },
      )
    })
  })
})
