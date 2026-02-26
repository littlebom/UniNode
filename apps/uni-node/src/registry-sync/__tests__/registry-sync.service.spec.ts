import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { SchedulerRegistry } from '@nestjs/schedule'
import { HttpService } from '@nestjs/axios'
import { of, throwError } from 'rxjs'
import { RegistrySyncService } from '../registry-sync.service'
import { RegistrySyncRepository } from '../registry-sync.repository'

// Mock external packages to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

// Mock 'cron' module
const mockCronJobInstance = {
  start: jest.fn(),
  stop: jest.fn(),
}
jest.mock('cron', () => ({
  CronJob: jest.fn().mockImplementation(() => mockCronJobInstance),
}))

// Partial mock of 'fs' — must keep actual implementation for path-scurry/TypeORM
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-cert-data')),
}))

describe('RegistrySyncService', () => {
  let service: RegistrySyncService

  const mockSyncRepo = {
    buildAggregateStats: jest.fn(),
    createSyncLog: jest.fn(),
    updateSyncLog: jest.fn(),
    findSyncLogs: jest.fn(),
    findLastSuccessfulSync: jest.fn(),
  }

  const mockHttpService = {
    post: jest.fn(),
  }

  const mockSchedulerRegistry = {
    addCronJob: jest.fn(),
    deleteCronJob: jest.fn(),
  }

  const defaultConfigMap: Record<string, string> = {
    REGISTRY_URL: 'https://registry.unilink.ac.th/api/v1',
    NODE_ID: 'tu.ac.th',
    REGISTRY_NODE_JWT: 'mock-jwt-token',
    AGGREGATE_SYNC_ENABLED: 'true',
    AGGREGATE_SYNC_CRON: '0 2 * * *',
  }

  const createService = async (
    configOverrides?: Record<string, string | undefined>,
  ): Promise<RegistrySyncService> => {
    const configMap = { ...defaultConfigMap, ...configOverrides }

    const mockConfigService = {
      get: jest.fn(<T>(key: string, defaultValue?: T): T => {
        const value = configMap[key]
        return (value !== undefined ? value : defaultValue) as T
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrySyncService,
        { provide: RegistrySyncRepository, useValue: mockSyncRepo },
        { provide: HttpService, useValue: mockHttpService },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    return module.get<RegistrySyncService>(RegistrySyncService)
  }

  const mockSyncLogEntity = {
    id: 'sync-log-uuid-1',
    syncType: 'aggregate',
    status: 'running',
    nodeId: 'tu.ac.th',
    academicYear: '2569',
    semester: '2',
    courseCount: null,
    payload: null,
    response: null,
    errorMessage: null,
    startedAt: new Date('2026-02-23T02:00:00Z'),
    completedAt: null,
    createdAt: new Date('2026-02-23T02:00:00Z'),
  }

  const mockCourseStats = [
    { courseId: 'CS101', enrolledCount: 150, passedCount: 120, avgGradePoint: 3.25 },
    { courseId: 'CS201', enrolledCount: 80, passedCount: 65, avgGradePoint: 2.95 },
  ]

  const mockRegistryResponse = {
    data: {
      success: true,
      data: {
        aggregateId: 'agg-uuid-1',
        nodeId: 'tu.ac.th',
        status: 'received' as const,
      },
      timestamp: '2026-02-23T02:00:05Z',
    },
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    service = await createService()

    // Default mocks
    mockSyncRepo.createSyncLog.mockResolvedValue(mockSyncLogEntity)
    mockSyncRepo.updateSyncLog.mockResolvedValue({
      ...mockSyncLogEntity,
      status: 'success',
    })
    mockSyncRepo.buildAggregateStats.mockResolvedValue(mockCourseStats)
    mockHttpService.post.mockReturnValue(of(mockRegistryResponse))
  })

  // ─── onModuleInit ──────────────────────────────────────────

  describe('onModuleInit', () => {
    it('should register cron job when sync is enabled', async () => {
      service = await createService({ AGGREGATE_SYNC_ENABLED: 'true' })
      service.onModuleInit()

      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
        'aggregate-sync',
        expect.anything(),
      )
      expect(mockCronJobInstance.start).toHaveBeenCalled()
    })

    it('should NOT register cron job when sync is disabled', async () => {
      service = await createService({ AGGREGATE_SYNC_ENABLED: 'false' })
      service.onModuleInit()

      expect(mockSchedulerRegistry.addCronJob).not.toHaveBeenCalled()
    })

    it('should setup mTLS agent when cert paths are configured', async () => {
      const fs = require('fs')
      service = await createService({
        MTLS_CLIENT_CERT_PATH: '/certs/client.pem',
        MTLS_CLIENT_KEY_PATH: '/certs/client-key.pem',
        MTLS_CA_CERT_PATH: '/certs/ca.pem',
      })
      service.onModuleInit()

      expect(fs.readFileSync).toHaveBeenCalledWith('/certs/client.pem')
      expect(fs.readFileSync).toHaveBeenCalledWith('/certs/client-key.pem')
      expect(fs.readFileSync).toHaveBeenCalledWith('/certs/ca.pem')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((service as any).httpsAgent).toBeDefined()
    })

    it('should skip mTLS setup when cert paths are not configured', async () => {
      const fs = require('fs')
      service = await createService()
      fs.readFileSync.mockClear()
      service.onModuleInit()

      // fs.readFileSync should not be called for mTLS setup
      // (it may be called 0 times since no cert paths)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((service as any).httpsAgent).toBeUndefined()
    })

    it('should handle cron registration error gracefully', async () => {
      const { CronJob } = require('cron')
      CronJob.mockImplementationOnce(() => {
        throw new Error('Invalid cron expression')
      })

      service = await createService()
      // Should not throw
      expect(() => service.onModuleInit()).not.toThrow()
    })
  })

  // ─── getCurrentAcademicPeriod ──────────────────────────────

  describe('getCurrentAcademicPeriod', () => {
    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return semester 1 for June', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-06-15'))

      service = await createService()
      const result = service.getCurrentAcademicPeriod()

      expect(result.academicYear).toBe('2569') // 2026 + 543
      expect(result.semester).toBe('1')
    })

    it('should return semester 1 for October', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-10-15'))

      service = await createService()
      const result = service.getCurrentAcademicPeriod()

      expect(result.academicYear).toBe('2569')
      expect(result.semester).toBe('1')
    })

    it('should return semester 2 for November', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-11-15'))

      service = await createService()
      const result = service.getCurrentAcademicPeriod()

      expect(result.academicYear).toBe('2569') // same year as sem 1
      expect(result.semester).toBe('2')
    })

    it('should return semester 2 for January (next CE year)', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2027-01-15'))

      service = await createService()
      const result = service.getCurrentAcademicPeriod()

      expect(result.academicYear).toBe('2569') // 2027 - 1 + 543
      expect(result.semester).toBe('2')
    })

    it('should return semester 2 for March', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2027-03-15'))

      service = await createService()
      const result = service.getCurrentAcademicPeriod()

      expect(result.academicYear).toBe('2569')
      expect(result.semester).toBe('2')
    })

    it('should return summer for April', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-04-15'))

      service = await createService()
      const result = service.getCurrentAcademicPeriod()

      expect(result.academicYear).toBe('2568') // 2026 - 1 + 543
      expect(result.semester).toBe('S')
    })

    it('should return summer for May', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-05-15'))

      service = await createService()
      const result = service.getCurrentAcademicPeriod()

      expect(result.academicYear).toBe('2568')
      expect(result.semester).toBe('S')
    })
  })

  // ─── handleAggregateCron ───────────────────────────────────

  describe('handleAggregateCron', () => {
    it('should build stats, send to registry, and log success', async () => {
      await service.handleAggregateCron()

      expect(mockSyncRepo.createSyncLog).toHaveBeenCalledWith(
        expect.objectContaining({
          syncType: 'aggregate',
          status: 'running',
          nodeId: 'tu.ac.th',
        }),
      )
      expect(mockSyncRepo.buildAggregateStats).toHaveBeenCalled()
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://registry.unilink.ac.th/api/v1/aggregate',
        expect.objectContaining({
          nodeId: 'tu.ac.th',
          courses: mockCourseStats,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-jwt-token',
          }),
        }),
      )
      expect(mockSyncRepo.updateSyncLog).toHaveBeenCalledWith(
        'sync-log-uuid-1',
        expect.objectContaining({
          status: 'success',
          courseCount: 2,
        }),
      )
    })

    it('should skip sync when no aggregate data found', async () => {
      mockSyncRepo.buildAggregateStats.mockResolvedValue([])

      await service.handleAggregateCron()

      expect(mockHttpService.post).not.toHaveBeenCalled()
      expect(mockSyncRepo.updateSyncLog).toHaveBeenCalledWith(
        'sync-log-uuid-1',
        expect.objectContaining({
          status: 'success',
          courseCount: 0,
        }),
      )
    })

    it('should log failure when registry request throws', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Connection refused')),
      )

      // Should not throw (cron safety)
      await service.handleAggregateCron()

      expect(mockSyncRepo.updateSyncLog).toHaveBeenCalledWith(
        'sync-log-uuid-1',
        expect.objectContaining({
          status: 'failed',
          errorMessage: expect.stringContaining('Connection refused'),
        }),
      )
    })

    it('should log failure when registry returns error response', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: {
            success: false,
            error: { message: 'Node not registered' },
          },
        }),
      )

      await service.handleAggregateCron()

      expect(mockSyncRepo.updateSyncLog).toHaveBeenCalledWith(
        'sync-log-uuid-1',
        expect.objectContaining({
          status: 'failed',
          errorMessage: expect.stringContaining('Node not registered'),
        }),
      )
    })

    it('should include Authorization header when JWT is configured', async () => {
      await service.handleAggregateCron()

      const postCall = mockHttpService.post.mock.calls[0]
      expect(postCall[2].headers.Authorization).toBe('Bearer mock-jwt-token')
    })

    it('should not include Authorization header when JWT is empty', async () => {
      service = await createService({ REGISTRY_NODE_JWT: '' })
      mockSyncRepo.createSyncLog.mockResolvedValue(mockSyncLogEntity)
      mockSyncRepo.buildAggregateStats.mockResolvedValue(mockCourseStats)
      mockHttpService.post.mockReturnValue(of(mockRegistryResponse))

      await service.handleAggregateCron()

      const postCall = mockHttpService.post.mock.calls[0]
      expect(postCall[2].headers.Authorization).toBeUndefined()
    })
  })

  // ─── triggerManualSync ─────────────────────────────────────

  describe('triggerManualSync', () => {
    it('should create sync log and return syncLogId', async () => {
      const result = await service.triggerManualSync()

      expect(result.syncLogId).toBe('sync-log-uuid-1')
      expect(result.academicYear).toBeDefined()
      expect(result.semester).toBeDefined()
      expect(mockSyncRepo.createSyncLog).toHaveBeenCalledWith(
        expect.objectContaining({
          syncType: 'aggregate',
          status: 'running',
          nodeId: 'tu.ac.th',
        }),
      )
    })

    it('should use provided academicYear and semester', async () => {
      const result = await service.triggerManualSync('2568', '1')

      expect(result.academicYear).toBe('2568')
      expect(result.semester).toBe('1')
      expect(mockSyncRepo.createSyncLog).toHaveBeenCalledWith(
        expect.objectContaining({
          academicYear: '2568',
          semester: '1',
        }),
      )
    })

    it('should use getCurrentAcademicPeriod when no override', async () => {
      const period = service.getCurrentAcademicPeriod()
      const result = await service.triggerManualSync()

      expect(result.academicYear).toBe(period.academicYear)
      expect(result.semester).toBe(period.semester)
    })

    it('should throw error when NODE_ID is not configured', async () => {
      service = await createService({ NODE_ID: '' })

      await expect(service.triggerManualSync()).rejects.toThrow(
        'NODE_ID is not configured',
      )
    })
  })

  // ─── getSyncHistory ────────────────────────────────────────

  describe('getSyncHistory', () => {
    const mockLogs = [
      {
        ...mockSyncLogEntity,
        status: 'success',
        courseCount: 15,
        completedAt: new Date(),
      },
    ]

    it('should return transformed sync history', async () => {
      mockSyncRepo.findSyncLogs.mockResolvedValue({
        data: mockLogs,
        total: 1,
      })

      const result = await service.getSyncHistory({ syncType: 'aggregate' })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('sync-log-uuid-1')
      expect(result.data[0].syncType).toBe('aggregate')
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should use default page=1 and limit=20', async () => {
      mockSyncRepo.findSyncLogs.mockResolvedValue({ data: [], total: 0 })

      await service.getSyncHistory()

      expect(mockSyncRepo.findSyncLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
        }),
      )
    })
  })

  // ─── getLastSync ───────────────────────────────────────────

  describe('getLastSync', () => {
    it('should return last sync info when exists', async () => {
      mockSyncRepo.findLastSuccessfulSync.mockResolvedValue({
        ...mockSyncLogEntity,
        status: 'success',
        completedAt: new Date('2026-02-23T02:05:00Z'),
        courseCount: 15,
      })

      const result = await service.getLastSync()

      expect(result.lastSync).toEqual(new Date('2026-02-23T02:05:00Z'))
      expect(result.academicYear).toBe('2569')
      expect(result.semester).toBe('2')
      expect(result.courseCount).toBe(15)
    })

    it('should return nulls when no successful sync exists', async () => {
      mockSyncRepo.findLastSuccessfulSync.mockResolvedValue(null)

      const result = await service.getLastSync()

      expect(result.lastSync).toBeNull()
      expect(result.academicYear).toBeNull()
      expect(result.semester).toBeNull()
      expect(result.courseCount).toBeNull()
    })
  })
})
