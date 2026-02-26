import { Controller, Get, Param, Header } from '@nestjs/common'
import { Public } from '../auth/decorators/public.decorator'
import { StatusListService } from '../vc/status-list.service'
import type { StatusListCredential } from '@unilink/dto'

@Controller('.well-known')
export class StatusListController {
  constructor(private readonly statusListService: StatusListService) {}

  @Get('status-list/:id')
  @Public()
  @Header('Cache-Control', 'public, max-age=60')
  @Header('Content-Type', 'application/json')
  async getStatusList(
    @Param('id') id: string,
  ): Promise<StatusListCredential> {
    return this.statusListService.getStatusListCredential(id)
  }
}
