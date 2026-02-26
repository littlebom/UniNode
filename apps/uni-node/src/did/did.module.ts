import { Module, forwardRef } from '@nestjs/common'
import { CryptoModule } from '../crypto/crypto.module'
import { VCModule } from '../vc/vc.module'
import { DIDController } from './did.controller'
import { StatusListController } from './status-list.controller'
import { DIDService } from './did.service'

@Module({
  imports: [CryptoModule, forwardRef(() => VCModule)],
  controllers: [DIDController, StatusListController],
  providers: [DIDService],
  exports: [DIDService],
})
export class DIDModule {}
