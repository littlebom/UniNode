import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ExternalService } from './external.service'
import { ListExternalQueryDto } from './dto/list-external-query.dto'
import { SubmitExternalDto } from './dto/submit-external.dto'
import { ApproveExternalDto } from './dto/approve-external.dto'
import { RejectExternalDto } from './dto/reject-external.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type {
  ApiResponse,
  PaginatedResponse,
  ExternalListItem,
  ExternalDetail,
} from '@unilink/dto'

@Controller('external')
export class ExternalController {
  constructor(private readonly externalService: ExternalService) {}

  /**
   * GET /external — List external credential requests
   * Auth: JWT required
   */
  @Get()
  async listRequests(
    @Query() query: ListExternalQueryDto,
  ): Promise<ApiResponse<PaginatedResponse<ExternalListItem>>> {
    const result = await this.externalService.listRequests({
      page: query.page,
      limit: query.limit,
      status: query.status,
    })
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /external/:requestId — Get external credential detail
   * Auth: JWT required
   */
  @Get(':requestId')
  async getDetail(
    @Param('requestId') requestId: string,
  ): Promise<ApiResponse<ExternalDetail>> {
    const result = await this.externalService.getDetail(requestId)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * POST /external/submit — Submit an external credential request
   * Auth: JWT required
   */
  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  async submitRequest(
    @Body() dto: SubmitExternalDto,
  ): Promise<ApiResponse<ExternalDetail>> {
    const result = await this.externalService.submitRequest(dto)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * PUT /external/:requestId/approve — Approve an external credential
   * Auth: node_admin or registrar role required
   */
  @Put(':requestId/approve')
  @Roles('node_admin', 'registrar')
  async approve(
    @Param('requestId') requestId: string,
    @Body() dto: ApproveExternalDto,
    @CurrentUser('sub') reviewedBy: string,
  ): Promise<ApiResponse<ExternalDetail>> {
    const result = await this.externalService.approve(
      requestId,
      dto,
      reviewedBy,
    )
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * PUT /external/:requestId/reject — Reject an external credential
   * Auth: node_admin or registrar role required
   */
  @Put(':requestId/reject')
  @Roles('node_admin', 'registrar')
  async reject(
    @Param('requestId') requestId: string,
    @Body() dto: RejectExternalDto,
    @CurrentUser('sub') reviewedBy: string,
  ): Promise<ApiResponse<ExternalDetail>> {
    const result = await this.externalService.reject(
      requestId,
      dto,
      reviewedBy,
    )
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }
}
