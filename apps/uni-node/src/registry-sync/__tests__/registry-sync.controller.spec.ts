import { Test, TestingModule } from '@nestjs/testing'
import { RegistrySyncController } from '../registry-sync.controller'
import { RegistrySyncService } from '../registry-sync.service'

// Mock packages to avoid ESM dependency issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

describe('RegistrySyncController', () => {
  let controller: RegistrySyncController

  const mockSyncService = {
    triggerManualSync: jest.fn(),
    getSyncHistory: jest.fn(),
    getLastSync: jest.fn(),
    getCurrentAcademicPeriod: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrySyncController],
      providers: [
        { provide: RegistrySyncService, useValue: mockSyncService },
      ],
    }).compile()

    controller = module.get<RegistrySyncController>(RegistrySyncController)

    // Default mocks
    mockSyncService.getCurrentAcademicPeriod.mockReturnValue({
      academicYear: '2569',
      semester: '2',
    })
  })

  // ─── POST /registry-sync/trigger ──────────────────────────

  describe('POST /registry-sync/trigger', () => {
    it('should trigger sync and return ApiResponse', async () => {
      mockSyncService.triggerManualSync.mockResolvedValue({
        syncLogId: 'sync-uuid-1',
        academicYear: '2569',
        semester: '2',
      })

      const result = await controller.triggerSync({})

      expect(result.success).toBe(true)
      expect(result.data?.syncLogId).toBe('sync-uuid-1')
      expect(result.data?.academicYear).toBe('2569')
      expect(result.data?.semester).toBe('2')
      expect(result.timestamp).toBeDefined()
    })

    it('should pass academicYear and semester to service', async () => {
      mockSyncService.triggerManualSync.mockResolvedValue({
        syncLogId: 'sync-uuid-2',
        academicYear: '2568',
        semester: '1',
      })

      await controller.triggerSync({
        academicYear: '2568',
        semester: '1',
      })

      expect(mockSyncService.triggerManualSync).toHaveBeenCalledWith(
        '2568',
        '1',
      )
    })

    it('should pass undefined when no DTO values provided', async () => {
      mockSyncService.triggerManualSync.mockResolvedValue({
        syncLogId: 'sync-uuid-3',
        academicYear: '2569',
        semester: '2',
      })

      await controller.triggerSync({})

      expect(mockSyncService.triggerManualSync).toHaveBeenCalledWith(
        undefined,
        undefined,
      )
    })

    it('should propagate service errors', async () => {
      mockSyncService.triggerManualSync.mockRejectedValue(
        new Error('NODE_ID is not configured'),
      )

      await expect(controller.triggerSync({})).rejects.toThrow(
        'NODE_ID is not configured',
      )
    })
  })

  // ─── GET /registry-sync/history ───────────────────────────

  describe('GET /registry-sync/history', () => {
    it('should return paginated sync history', async () => {
      const mockData = [
        {
          id: 'log-1',
          syncType: 'aggregate',
          status: 'success',
          academicYear: '2569',
          semester: '2',
          courseCount: 15,
          errorMessage: null,
          startedAt: new Date('2026-02-23T02:00:00Z'),
          completedAt: new Date('2026-02-23T02:00:05Z'),
        },
      ]
      mockSyncService.getSyncHistory.mockResolvedValue({
        data: mockData,
        total: 1,
        page: 1,
        limit: 20,
      })

      const result = await controller.getSyncHistory({})

      expect(result.success).toBe(true)
      expect(result.data?.data).toHaveLength(1)
      expect(result.data?.meta.total).toBe(1)
      expect(result.data?.meta.page).toBe(1)
      expect(result.data?.meta.limit).toBe(20)
      expect(result.data?.meta.totalPages).toBe(1)
    })

    it('should pass query params to service', async () => {
      mockSyncService.getSyncHistory.mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        limit: 10,
      })

      await controller.getSyncHistory({
        syncType: 'aggregate',
        status: 'failed',
        page: 2,
        limit: 10,
      })

      expect(mockSyncService.getSyncHistory).toHaveBeenCalledWith({
        syncType: 'aggregate',
        status: 'failed',
        page: 2,
        limit: 10,
      })
    })

    it('should handle empty history', async () => {
      mockSyncService.getSyncHistory.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      })

      const result = await controller.getSyncHistory({})

      expect(result.data?.data).toHaveLength(0)
      expect(result.data?.meta.total).toBe(0)
      expect(result.data?.meta.totalPages).toBe(0)
    })
  })

  // ─── GET /registry-sync/status ────────────────────────────

  describe('GET /registry-sync/status', () => {
    it('should return last sync info and current period', async () => {
      mockSyncService.getLastSync.mockResolvedValue({
        lastSync: new Date('2026-02-23T02:05:00Z'),
        academicYear: '2569',
        semester: '2',
        courseCount: 15,
      })

      const result = await controller.getSyncStatus()

      expect(result.success).toBe(true)
      expect(result.data?.lastSync).toEqual(new Date('2026-02-23T02:05:00Z'))
      expect(result.data?.courseCount).toBe(15)
      expect(result.data?.currentPeriod.academicYear).toBe('2569')
      expect(result.data?.currentPeriod.semester).toBe('2')
    })

    it('should return nulls when no previous sync exists', async () => {
      mockSyncService.getLastSync.mockResolvedValue({
        lastSync: null,
        academicYear: null,
        semester: null,
        courseCount: null,
      })

      const result = await controller.getSyncStatus()

      expect(result.success).toBe(true)
      expect(result.data?.lastSync).toBeNull()
      expect(result.data?.courseCount).toBeNull()
      expect(result.data?.currentPeriod).toBeDefined()
    })

    it('should propagate service errors', async () => {
      mockSyncService.getLastSync.mockRejectedValue(
        new Error('Database connection failed'),
      )

      await expect(controller.getSyncStatus()).rejects.toThrow(
        'Database connection failed',
      )
    })
  })
})
