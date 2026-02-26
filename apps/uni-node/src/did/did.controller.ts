import { Controller, Get, Header } from '@nestjs/common'
import { DIDService } from './did.service'
import { Public } from '../auth/decorators/public.decorator'
import type { DIDDocument } from '@unilink/vc-core'

@Controller('.well-known')
export class DIDController {
  constructor(private readonly didService: DIDService) {}

  @Get('did.json')
  @Public()
  @Header('Cache-Control', 'public, max-age=300')
  @Header('Content-Type', 'application/did+json')
  async getDIDDocument(): Promise<DIDDocument> {
    return this.didService.getDIDDocument()
  }
}
