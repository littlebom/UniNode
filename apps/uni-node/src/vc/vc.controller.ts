import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { VCService } from './vc.service'
import { IssueVcDto } from './dto/issue-vc.dto'
import { RevokeVcDto } from './dto/revoke-vc.dto'
import { ChallengeDto } from './dto/challenge.dto'
import { VerifyVpDto } from './dto/verify-vp.dto'
import { Public } from '../auth/decorators/public.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import type { ApiResponse } from '@unilink/dto'
import type { VPVerifyResult } from '@unilink/vc-core'

@Controller('vc')
export class VCController {
  constructor(private readonly vcService: VCService) {}

  /**
   * POST /vc/issue — Issue a new VC
   * Auth: node_admin role required
   */
  @Post('issue')
  @Roles('node_admin')
  @HttpCode(HttpStatus.CREATED)
  async issueVC(@Body() dto: IssueVcDto): Promise<ApiResponse<{
    vcId: string
    status: string
  }>> {
    const result = await this.vcService.issueVC(dto)
    return {
      success: true,
      data: {
        vcId: result.vcId,
        status: result.status,
      },
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /vc/:vcId — Get VC details
   * Auth: JWT required
   */
  @Get(':vcId')
  async getVC(@Param('vcId') vcId: string): Promise<ApiResponse<{
    vcId: string
    status: string
    vc: Record<string, unknown>
    issuedAt: Date | null
    revokedAt: Date | null
  }>> {
    const result = await this.vcService.getVC(vcId)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * DELETE /vc/:vcId/revoke — Revoke a VC
   * Auth: node_admin role required
   */
  @Delete(':vcId/revoke')
  @Roles('node_admin')
  async revokeVC(
    @Param('vcId') vcId: string,
    @Body() dto: RevokeVcDto,
  ): Promise<ApiResponse<{ vcId: string; status: string }>> {
    const result = await this.vcService.revokeVC(vcId, dto.reason)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * POST /vc/challenge — Generate a challenge for VP verification
   * Auth: Public (anyone can request a challenge)
   */
  @Post('challenge')
  @Public()
  @HttpCode(HttpStatus.OK)
  generateChallenge(@Body() dto: ChallengeDto): ApiResponse<{
    challenge: string
    expiresAt: string
  }> {
    const result = this.vcService.generateChallenge(dto.domain)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * POST /vc/verify — Verify a Verifiable Presentation
   * Auth: Public (any verifier can submit a VP for verification)
   */
  @Post('verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyPresentation(
    @Body() dto: VerifyVpDto,
  ): Promise<ApiResponse<VPVerifyResult>> {
    const result = await this.vcService.verifyPresentation(
      dto.vp,
      dto.challenge,
      dto.domain,
    )
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }
}
