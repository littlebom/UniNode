import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { CryptoService } from '../crypto/crypto.service'
import { RegistrySyncService } from '../registry-sync/registry-sync.service'
import { NodeConfigEntity } from './node-config.entity'

export interface KeyInfo {
  did: string
  publicKeyMultibase: string
  keyType: string
  signingKeyPath: string
  didDocumentUrl: string
}

export interface RegistryConnection {
  registryUrl: string
  nodeId: string
  nodeName: string
  nodeDid: string
  syncEnabled: boolean
  syncCron: string
  lastSync: Date | null
  lastSyncCourseCount: number | null
}

export interface UpdateRegistryConnectionDto {
  registryUrl?: string
  syncEnabled?: boolean
  syncCron?: string
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly config: ConfigService,
    private readonly cryptoService: CryptoService,
    private readonly registrySyncService: RegistrySyncService,
    @InjectRepository(NodeConfigEntity)
    private readonly nodeConfigRepo: Repository<NodeConfigEntity>,
  ) {}

  async getKeyInfo(): Promise<KeyInfo> {
    const domain = this.config.get<string>('NODE_DOMAIN', 'localhost')
    const signingKeyPath = this.config.get<string>('VAULT_SIGNING_KEY_PATH', '')
    const publicKeyMultibase = await this.cryptoService.getPublicKeyMultibase()

    return {
      did: `did:web:${domain}`,
      publicKeyMultibase,
      keyType: 'Ed25519VerificationKey2020',
      signingKeyPath,
      didDocumentUrl: `https://${domain}/.well-known/did.json`,
    }
  }

  private async getNodeConfig(): Promise<NodeConfigEntity | null> {
    return this.nodeConfigRepo.findOne({ where: {}, order: { updatedAt: 'DESC' } })
  }

  async getRegistryConnection(): Promise<RegistryConnection> {
    const [dbConfig, lastSync] = await Promise.all([
      this.getNodeConfig(),
      this.registrySyncService.getLastSync(),
    ])

    return {
      registryUrl:
        dbConfig?.registryUrl ??
        this.config.get<string>('REGISTRY_URL', ''),
      nodeId: this.config.get<string>('NODE_ID', ''),
      nodeName: this.config.get<string>('NODE_NAME', ''),
      nodeDid: this.config.get<string>('NODE_DID', ''),
      syncEnabled:
        dbConfig?.syncEnabled ??
        this.config.get<string>('AGGREGATE_SYNC_ENABLED', 'true') === 'true',
      syncCron:
        dbConfig?.syncCron ??
        this.config.get<string>('AGGREGATE_SYNC_CRON', '0 2 * * *'),
      lastSync: lastSync.lastSync,
      lastSyncCourseCount: lastSync.courseCount,
    }
  }

  async updateRegistryConnection(
    dto: UpdateRegistryConnectionDto,
  ): Promise<RegistryConnection> {
    let dbConfig = await this.getNodeConfig()

    if (!dbConfig) {
      dbConfig = this.nodeConfigRepo.create()
    }

    if (dto.registryUrl !== undefined) {
      dbConfig.registryUrl = dto.registryUrl
    }
    if (dto.syncEnabled !== undefined) {
      dbConfig.syncEnabled = dto.syncEnabled
    }
    if (dto.syncCron !== undefined) {
      dbConfig.syncCron = dto.syncCron
    }

    await this.nodeConfigRepo.save(dbConfig)

    // Apply changes to running sync service
    const connection = await this.getRegistryConnection()
    this.registrySyncService.applySyncConfig(
      connection.registryUrl,
      connection.syncEnabled,
      connection.syncCron,
    )

    return connection
  }
}
