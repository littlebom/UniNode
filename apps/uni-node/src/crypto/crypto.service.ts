import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { VaultCrypto } from '@unilink/crypto'

@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name)
  private vault!: VaultCrypto

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.getOrThrow<string>('VAULT_URL')
    const token = this.config.getOrThrow<string>('VAULT_TOKEN')
    const keyPath = this.config.getOrThrow<string>('VAULT_SIGNING_KEY_PATH')
    const mountPath = this.config.get<string>('VAULT_MOUNT_PATH', 'transit')

    this.vault = new VaultCrypto({ url, token, keyPath, mountPath })

    // Verify Vault connectivity by fetching public key
    try {
      const pubKey = await this.vault.getPublicKey()
      this.logger.log(`Vault connected — public key loaded (${pubKey.substring(0, 20)}...)`)
    } catch (error) {
      this.logger.error(
        `Failed to connect to Vault: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
      throw error
    }
  }

  async sign(data: string): Promise<string> {
    return this.vault.sign(data)
  }

  async verify(data: string, signature: string): Promise<boolean> {
    return this.vault.verify(data, signature)
  }

  async getPublicKey(): Promise<string> {
    return this.vault.getPublicKey()
  }

  /**
   * Returns the public key in W3C multibase format: 'z' + base64 encoded key
   * Used for DID Document verificationMethod
   */
  async getPublicKeyMultibase(): Promise<string> {
    const publicKey = await this.vault.getPublicKey()
    return `z${publicKey}`
  }
}
