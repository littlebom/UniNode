import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CryptoModule } from '../crypto/crypto.module'
import { StudentModule } from '../student/student.module'
import { CourseModule } from '../course/course.module'
import { IssuedVcEntity } from './issued-vc.entity'
import { StatusListEntity } from './status-list.entity'
import { VCRepository } from './vc.repository'
import { StatusListRepository } from './status-list.repository'
import { VCService } from './vc.service'
import { StatusListService } from './status-list.service'
import { VCController } from './vc.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([IssuedVcEntity, StatusListEntity]),
    CryptoModule,
    StudentModule,
    CourseModule,
  ],
  controllers: [VCController],
  providers: [
    VCRepository,
    StatusListRepository,
    VCService,
    StatusListService,
  ],
  exports: [VCService, StatusListService, VCRepository],
})
export class VCModule {}
