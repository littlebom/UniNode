import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SchedulerRegistry } from '@nestjs/schedule'
import { HttpService } from '@nestjs/axios'
import { CronJob } from 'cron'
import { firstValueFrom } from 'rxjs'
import * as https from 'https'
import * as fs from 'fs'
import { RegistrySyncRepository } from './registry-sync.repository'
import type {
  AggregateSubmission,
  AggregateSubmitResult,
  ApiResponse,
} from '@unilink/dto'

@Injectable()
export class RegistrySyncService implements OnModuleInit {
  private readonly logger = new Logger(RegistrySyncService.name)
  private readonly registryUrl: string
  private readonly nodeId: string
  private readonly nodeJwt: string
  private readonly syncEnabled: boolean
  private readonly syncCron: string
  private httpsAgent: https.Agent | undefined

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly syncRepo: RegistrySyncRepository,
  ) {
    this.registryUrl = this.configService.get<string>(
      'REGISTRY_URL',
      'http://localhost:3000/api/v1',
    )
    this.nodeId = this.configService.get<string>('NODE_ID', '')
    this.nodeJwt = this.configService.get<string>('REGISTRY_NODE_JWT', '')
    this.syncEnabled =
      this.configService.get<string>('AGGREGATE_SYNC_ENABLED', 'true') ===
      'true'
    this.syncCron = this.configService.get<string>(
      'AGGREGATE_SYNC_CRON',
      '0 2 * * *',
    )
  }

  onModuleInit(): void {
    if (!this.syncEnabled) {
      this.logger.warn('Aggregate sync is DISABLED')
      return
    }

    // Register dynamic cron job from config
    try {
      const job = new CronJob(this.syncCron, () => {
        void this.handleAggregateCron()
      })
      this.schedulerRegistry.addCronJob('aggregate-sync', job)
      job.start()
      this.logger.log(
        `Aggregate sync cron registered: "${this.syncCron}" for node ${this.nodeId}`,
      )
    } catch (error) {
      this.logger.error(
        `Failed to register aggregate cron: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    // Setup mTLS agent if cert paths are configured
    this.setupMtlsAgent()
  }

  private setupMtlsAgent(): void {
    const certPath = this.configService.get<string>('MTLS_CLIENT_CERT_PATH')
    const keyPath = this.configService.get<string>('MTLS_CLIENT_KEY_PATH')
    const caPath = this.configService.get<string>('MTLS_CA_CERT_PATH')

    if (certPath && keyPath) {
      try {
        const cert = fs.readFileSync(certPath)
        const key = fs.readFileSync(keyPath)
        const ca = caPath ? fs.readFileSync(caPath) : undefined

        this.httpsAgent = new https.Agent({ cert, key, ca })
        this.logger.log('mTLS agent configured for registry communication')
      } catch (error) {
        this.logger.warn(
          `mTLS certificates not found, continuing without mTLS: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    } else {
      this.logger.debug(
        'mTLS cert paths not configured, skipping mTLS setup',
      )
    }
  }

  /**
   * Cron job handler — runs nightly to send aggregate data to registry.
   * Also callable manually via controller.
   */
  async handleAggregateCron(): Promise<void> {
    this.logger.log('Starting aggregate sync...')

    const { academicYear, semester } = this.getCurrentAcademicPeriod()

    // Create sync log entry
    const syncLog = await this.syncRepo.createSyncLog({
      syncType: 'aggregate',
      status: 'running',
      nodeId: this.nodeId,
      academicYear,
      semester,
      startedAt: new Date(),
    })

    try {
      // Build aggregate stats from local DB
      const courseStats = await this.syncRepo.buildAggregateStats({
        academicYear,
        semester,
      })

      if (courseStats.length === 0) {
        this.logger.warn(
          `No aggregate data found for ${academicYear}/${semester}, skipping sync`,
        )
        await this.syncRepo.updateSyncLog(syncLog.id, {
          status: 'success',
          courseCount: 0,
          completedAt: new Date(),
        })
        return
      }

      // Build submission payload
      const submission: AggregateSubmission = {
        nodeId: this.nodeId,
        academicYear,
        semester,
        courses: courseStats,
      }

      this.logger.log(
        `Sending aggregate: ${courseStats.length} courses for ${academicYear}/${semester}`,
      )

      // Send to registry
      const result = await this.sendToRegistry(submission)

      // Update sync log
      await this.syncRepo.updateSyncLog(syncLog.id, {
        status: 'success',
        courseCount: courseStats.length,
        payload: submission as unknown as Record<string, unknown>,
        response: result as unknown as Record<string, unknown>,
        completedAt: new Date(),
      })

      this.logger.log(
        `Aggregate sync completed: aggregateId=${result.aggregateId}, ` +
          `status=${result.status}, courses=${courseStats.length}`,
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.logger.error(`Aggregate sync failed: ${errorMessage}`)

      await this.syncRepo.updateSyncLog(syncLog.id, {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      })

      // Don't rethrow — cron jobs should not crash the app
    }
  }

  /**
   * Send aggregate data to registry via POST /aggregate
   */
  private async sendToRegistry(
    submission: AggregateSubmission,
  ): Promise<AggregateSubmitResult> {
    const url = `${this.registryUrl}/aggregate`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.nodeJwt) {
      headers['Authorization'] = `Bearer ${this.nodeJwt}`
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<ApiResponse<AggregateSubmitResult>>(
          url,
          submission,
          {
            headers,
            httpsAgent: this.httpsAgent,
            timeout: 30000,
          },
        ),
      )

      if (!response.data.success || !response.data.data) {
        throw new Error(
          `Registry returned error: ${response.data.error?.message ?? 'Unknown error'}`,
        )
      }

      return response.data.data
    } catch (error) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as {
          response?: { status: number; data: unknown }
        }
        throw new Error(
          `Registry request failed: HTTP ${axiosError.response?.status ?? 'unknown'} — ${JSON.stringify(axiosError.response?.data ?? {})}`,
        )
      }
      throw error
    }
  }

  /**
   * Determine the current Thai academic period.
   *
   * Thai academic year convention:
   * - Semester 1: June–October (พ.ศ. = ค.ศ. + 543)
   * - Semester 2: November–March (same Thai year)
   * - Summer (S): April–May
   *
   * The "academic year" follows the year when Semester 1 starts.
   */
  getCurrentAcademicPeriod(): {
    academicYear: string
    semester: string
  } {
    const now = new Date()
    const month = now.getMonth() + 1 // 1-12
    const ceYear = now.getFullYear()

    let academicYear: number
    let semester: string

    if (month >= 6 && month <= 10) {
      // Semester 1: June-October
      academicYear = ceYear + 543
      semester = '1'
    } else if (month >= 11 || month <= 3) {
      // Semester 2: November-March
      // If Nov-Dec, academic year is this CE year + 543
      // If Jan-Mar, academic year is last CE year + 543
      academicYear = (month >= 11 ? ceYear : ceYear - 1) + 543
      semester = '2'
    } else {
      // Summer: April-May
      academicYear = ceYear - 1 + 543
      semester = 'S'
    }

    return {
      academicYear: String(academicYear),
      semester,
    }
  }

  /**
   * Manual trigger — allows admin to run sync via API
   */
  async triggerManualSync(
    academicYear?: string,
    semester?: string,
  ): Promise<{ syncLogId: string; academicYear: string; semester: string }> {
    if (!this.nodeId) {
      throw new Error('NODE_ID is not configured')
    }

    const period = academicYear && semester
      ? { academicYear, semester }
      : this.getCurrentAcademicPeriod()

    // Create sync log
    const syncLog = await this.syncRepo.createSyncLog({
      syncType: 'aggregate',
      status: 'running',
      nodeId: this.nodeId,
      academicYear: period.academicYear,
      semester: period.semester,
      startedAt: new Date(),
    })

    // Run sync in background (don't await)
    void this.runManualSync(syncLog.id, period)

    return {
      syncLogId: syncLog.id,
      academicYear: period.academicYear,
      semester: period.semester,
    }
  }

  private async runManualSync(
    syncLogId: string,
    period: { academicYear: string; semester: string },
  ): Promise<void> {
    try {
      const courseStats = await this.syncRepo.buildAggregateStats(period)

      if (courseStats.length === 0) {
        await this.syncRepo.updateSyncLog(syncLogId, {
          status: 'success',
          courseCount: 0,
          completedAt: new Date(),
        })
        return
      }

      const submission: AggregateSubmission = {
        nodeId: this.nodeId,
        academicYear: period.academicYear,
        semester: period.semester,
        courses: courseStats,
      }

      const result = await this.sendToRegistry(submission)

      await this.syncRepo.updateSyncLog(syncLogId, {
        status: 'success',
        courseCount: courseStats.length,
        payload: submission as unknown as Record<string, unknown>,
        response: result as unknown as Record<string, unknown>,
        completedAt: new Date(),
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.logger.error(`Manual sync failed: ${errorMessage}`)

      await this.syncRepo.updateSyncLog(syncLogId, {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      })
    }
  }

  /**
   * Get sync history for the admin dashboard
   */
  async getSyncHistory(options?: {
    syncType?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{
    data: Array<{
      id: string
      syncType: string
      status: string
      academicYear: string | null
      semester: string | null
      courseCount: number | null
      errorMessage: string | null
      startedAt: Date
      completedAt: Date | null
    }>
    total: number
    page: number
    limit: number
  }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20

    const result = await this.syncRepo.findSyncLogs({
      syncType: options?.syncType,
      status: options?.status,
      page,
      limit,
    })

    return {
      data: result.data.map((log) => ({
        id: log.id,
        syncType: log.syncType,
        status: log.status,
        academicYear: log.academicYear,
        semester: log.semester,
        courseCount: log.courseCount,
        errorMessage: log.errorMessage,
        startedAt: log.startedAt,
        completedAt: log.completedAt,
      })),
      total: result.total,
      page,
      limit,
    }
  }

  /**
   * Get the last successful sync info
   */
  async getLastSync(): Promise<{
    lastSync: Date | null
    academicYear: string | null
    semester: string | null
    courseCount: number | null
  }> {
    const lastLog =
      await this.syncRepo.findLastSuccessfulSync('aggregate')
    return {
      lastSync: lastLog?.completedAt ?? null,
      academicYear: lastLog?.academicYear ?? null,
      semester: lastLog?.semester ?? null,
      courseCount: lastLog?.courseCount ?? null,
    }
  }
}
