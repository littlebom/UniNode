import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CryptoService } from '../crypto/crypto.service'
import { getDIDDocument, DIDDocument } from '@unilink/vc-core'

@Injectable()
export class DIDService {
  private readonly logger = new Logger(DIDService.name)
  private cachedDocument: DIDDocument | null = null
  private cacheExpiresAt = 0
  private readonly cacheTTL = 5 * 60 * 1000 // 5 minutes

  constructor(
    private readonly config: ConfigService,
    private readonly cryptoService: CryptoService,
  ) {}

  async getDIDDocument(): Promise<DIDDocument> {
    const now = Date.now()

    // Return cached document if still valid
    if (this.cachedDocument && now < this.cacheExpiresAt) {
      return this.cachedDocument
    }

    const domain = this.config.get<string>('NODE_DOMAIN', 'localhost')
    const publicKeyMultibase = await this.cryptoService.getPublicKeyMultibase()

    this.cachedDocument = getDIDDocument(domain, publicKeyMultibase)
    this.cacheExpiresAt = now + this.cacheTTL

    this.logger.log(`DID document cached for ${domain} (TTL: 5min)`)
    return this.cachedDocument
  }

  /**
   * Force refresh the cached DID document
   */
  invalidateCache(): void {
    this.cachedDocument = null
    this.cacheExpiresAt = 0
    this.logger.log('DID document cache invalidated')
  }
}
