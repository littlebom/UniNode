import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { TransferService } from './transfer.service'
import { CreateTransferDto } from './dto/create-transfer.dto'
import { ReviewTransferDto } from './dto/review-transfer.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import type { ApiResponse, TransferResponse } from '@unilink/dto'

@Controller('transfer')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  /**
   * POST /transfer/request — Create a credit transfer request
   * Auth: node_admin role required
   */
  @Post('request')
  @Roles('node_admin')
  @HttpCode(HttpStatus.CREATED)
  async createTransfer(
    @Body() dto: CreateTransferDto,
  ): Promise<ApiResponse<TransferResponse>> {
    const result = await this.transferService.createTransferRequest(dto)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /transfer/:transferId — Get transfer details
   * Auth: JWT required
   */
  @Get(':transferId')
  async getTransfer(
    @Param('transferId') transferId: string,
  ): Promise<ApiResponse<TransferResponse>> {
    const result = await this.transferService.getTransfer(transferId)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * PUT /transfer/:transferId/approve — Approve a transfer
   * Auth: node_admin role required
   */
  @Put(':transferId/approve')
  @Roles('node_admin')
  async approveTransfer(
    @Param('transferId') transferId: string,
    @Body() dto: ReviewTransferDto,
  ): Promise<ApiResponse<TransferResponse>> {
    // TODO: Extract reviewedBy from JWT token (Sprint 15-16: Admin Portal)
    const reviewedBy = 'system-admin'
    const result = await this.transferService.approveTransfer(
      transferId,
      reviewedBy,
      dto.reviewNote,
    )
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * PUT /transfer/:transferId/reject — Reject a transfer
   * Auth: node_admin role required
   */
  @Put(':transferId/reject')
  @Roles('node_admin')
  async rejectTransfer(
    @Param('transferId') transferId: string,
    @Body() dto: ReviewTransferDto,
  ): Promise<ApiResponse<TransferResponse>> {
    // TODO: Extract reviewedBy from JWT token (Sprint 15-16: Admin Portal)
    const reviewedBy = 'system-admin'
    const result = await this.transferService.rejectTransfer(
      transferId,
      reviewedBy,
      dto.reviewNote,
    )
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }
}
