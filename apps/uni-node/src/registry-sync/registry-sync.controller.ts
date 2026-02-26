import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { IsString, IsOptional, IsNumber } from 'class-validator'
import { RegistrySyncService } from './registry-sync.service'
import { Roles } from '../auth/decorators/roles.decorator'
import type { ApiResponse, PaginatedResponse } from '@unilink/dto'

class TriggerSyncDto {
  @IsString()
  @IsOptional()
  academicYear?: string

  @IsString()
  @IsOptional()
  semester?: string
}

class SyncHistoryQueryDto {
  @IsString()
  @IsOptional()
  syncType?: string

  @IsString()
  @IsOptional()
  status?: string

  @IsNumber()
  @IsOptional()
  page?: number

  @IsNumber()
  @IsOptional()
  limit?: number
}

interface SyncLogSummary {
  id: string
  syncType: string
  status: string
  academicYear: string | null
  semester: string | null
  courseCount: number | null
  errorMessage: string | null
  startedAt: Date
  completedAt: Date | null
}

@Controller('registry-sync')
export class RegistrySyncController {
  constructor(private readonly syncService: RegistrySyncService) {}

  /**
   * POST /registry-sync/trigger
   * Manually trigger an aggregate sync to the registry.
   * Admin-only endpoint.
   */
  @Post('trigger')
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerSync(
    @Body() dto: TriggerSyncDto,
  ): Promise<
    ApiResponse<{
      syncLogId: string
      academicYear: string
      semester: string
    }>
  > {
    const result = await this.syncService.triggerManualSync(
      dto.academicYear,
      dto.semester,
    )
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /registry-sync/history
   * Get sync history logs.
   */
  @Get('history')
  @Roles('admin', 'registrar')
  async getSyncHistory(
    @Query() query: SyncHistoryQueryDto,
  ): Promise<ApiResponse<PaginatedResponse<SyncLogSummary>>> {
    const result = await this.syncService.getSyncHistory({
      syncType: query.syncType,
      status: query.status,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    })
    return {
      success: true,
      data: {
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      },
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /registry-sync/status
   * Get last sync info and current sync status.
   */
  @Get('status')
  @Roles('admin', 'registrar')
  async getSyncStatus(): Promise<
    ApiResponse<{
      lastSync: Date | null
      academicYear: string | null
      semester: string | null
      courseCount: number | null
      currentPeriod: { academicYear: string; semester: string }
    }>
  > {
    const [lastSync, currentPeriod] = await Promise.all([
      this.syncService.getLastSync(),
      Promise.resolve(this.syncService.getCurrentAcademicPeriod()),
    ])

    return {
      success: true,
      data: {
        ...lastSync,
        currentPeriod,
      },
      timestamp: new Date().toISOString(),
    }
  }
}
