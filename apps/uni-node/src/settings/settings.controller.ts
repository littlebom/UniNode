import { Controller, Get, Put, Body } from '@nestjs/common'
import { IsString, IsOptional, IsBoolean } from 'class-validator'
import { Roles } from '../auth/decorators/roles.decorator'
import {
  SettingsService,
  type KeyInfo,
  type RegistryConnection,
} from './settings.service'

class UpdateRegistryDto {
  @IsString()
  @IsOptional()
  registryUrl?: string

  @IsBoolean()
  @IsOptional()
  syncEnabled?: boolean

  @IsString()
  @IsOptional()
  syncCron?: string
}

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('keys')
  @Roles('node_admin', 'admin')
  async getKeyInfo(): Promise<{
    success: true
    data: KeyInfo
  }> {
    const data = await this.settingsService.getKeyInfo()
    return { success: true, data }
  }

  @Get('registry')
  @Roles('node_admin', 'admin')
  async getRegistryConnection(): Promise<{
    success: true
    data: RegistryConnection
  }> {
    const data = await this.settingsService.getRegistryConnection()
    return { success: true, data }
  }

  @Put('registry')
  @Roles('node_admin', 'admin')
  async updateRegistryConnection(
    @Body() dto: UpdateRegistryDto,
  ): Promise<{
    success: true
    data: RegistryConnection
  }> {
    const data = await this.settingsService.updateRegistryConnection(dto)
    return { success: true, data }
  }
}
