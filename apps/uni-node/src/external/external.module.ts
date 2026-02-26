import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { VCModule } from '../vc/vc.module'
import { StudentModule } from '../student/student.module'
import { ExternalCredentialEntity } from './external-credential.entity'
import { ExternalRepository } from './external.repository'
import { ExternalService } from './external.service'
import { ExternalController } from './external.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([ExternalCredentialEntity]),
    VCModule,
    StudentModule,
  ],
  controllers: [ExternalController],
  providers: [ExternalService, ExternalRepository],
  exports: [ExternalService],
})
export class ExternalModule {}
