import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CryptoModule } from '../crypto/crypto.module'
import { RegistrySyncModule } from '../registry-sync/registry-sync.module'
import { NodeConfigEntity } from './node-config.entity'
import { SettingsService } from './settings.service'
import { SettingsController } from './settings.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([NodeConfigEntity]),
    CryptoModule,
    RegistrySyncModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
