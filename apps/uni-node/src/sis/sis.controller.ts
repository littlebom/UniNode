import {
  Controller,
  Post,
  Body,
  HttpCode,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { Public } from '../auth/decorators/public.decorator'
import { SisWebhookGuard } from './guards/sis-webhook.guard'
import { SisService, SisWebhookResult } from './sis.service'
import { SisWebhookDto } from './dto/sis-webhook.dto'

@Controller('sis')
export class SisController {
  constructor(private readonly sisService: SisService) {}

  @Post('webhook')
  @Public()
  @UseGuards(SisWebhookGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @HttpCode(200)
  async handleWebhook(@Body() dto: SisWebhookDto): Promise<SisWebhookResult> {
    return this.sisService.processWebhook(dto)
  }
}
