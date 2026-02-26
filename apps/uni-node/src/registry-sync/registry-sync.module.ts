import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HttpModule } from '@nestjs/axios'
import { IssuedVcEntity } from '../vc/issued-vc.entity'
import { CourseOfferingEntity } from '../course/entities/course-offering.entity'
import { SyncLogEntity } from './sync-log.entity'
import { RegistrySyncRepository } from './registry-sync.repository'
import { RegistrySyncService } from './registry-sync.service'
import { RegistrySyncController } from './registry-sync.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IssuedVcEntity,
      CourseOfferingEntity,
      SyncLogEntity,
    ]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
  ],
  controllers: [RegistrySyncController],
  providers: [RegistrySyncService, RegistrySyncRepository],
  exports: [RegistrySyncService],
})
export class RegistrySyncModule {}
