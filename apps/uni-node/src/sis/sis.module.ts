import { Module } from '@nestjs/common'
import { VCModule } from '../vc/vc.module'
import { StudentModule } from '../student/student.module'
import { SisController } from './sis.controller'
import { SisService } from './sis.service'
import { SisWebhookGuard } from './guards/sis-webhook.guard'

@Module({
  imports: [VCModule, StudentModule],
  controllers: [SisController],
  providers: [SisService, SisWebhookGuard],
  exports: [SisService],
})
export class SISModule {}
