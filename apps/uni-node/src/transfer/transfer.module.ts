import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { VCModule } from '../vc/vc.module'
import { StudentModule } from '../student/student.module'
import { CreditTransferEntity } from './credit-transfer.entity'
import { TransferRepository } from './transfer.repository'
import { TransferService } from './transfer.service'
import { TransferController } from './transfer.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([CreditTransferEntity]),
    VCModule,
    StudentModule,
  ],
  controllers: [TransferController],
  providers: [TransferService, TransferRepository],
  exports: [TransferService],
})
export class TransferModule {}
