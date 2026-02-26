import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { DIDService } from '../did.service'
import { CryptoService } from '../../crypto/crypto.service'

// Mock packages to avoid ESM dependency issues (@noble/ed25519)
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  getDIDDocument: (domain: string, publicKeyMultibase: string) => {
    const did = `did:web:${domain}`
    return {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed2020/v1',
      ],
      id: did,
      verificationMethod: [
        {
          id: `${did}#key-1`,
          type: 'Ed25519VerificationKey2020',
          controller: did,
          publicKeyMultibase,
        },
      ],
      authentication: [`${did}#key-1`],
      assertionMethod: [`${did}#key-1`],
    }
  },
}))

describe('DIDService', () => {
  let service: DIDService
  let cryptoService: jest.Mocked<CryptoService>

  const mockConfig = {
    get: jest.fn((_key: string, defaultValue: string) => {
      const values: Record<string, string> = {
        NODE_DOMAIN: 'tu.ac.th',
      }
      return values[_key] ?? defaultValue
    }),
  }

  const mockCrypto = {
    getPublicKeyMultibase: jest.fn().mockResolvedValue('zdGVzdC1wdWJsaWMta2V5'),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DIDService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: CryptoService, useValue: mockCrypto },
      ],
    }).compile()

    service = module.get<DIDService>(DIDService)
    cryptoService = module.get(CryptoService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getDIDDocument', () => {
    it('should return a valid DID document', async () => {
      const doc = await service.getDIDDocument()

      expect(doc['@context']).toContain('https://www.w3.org/ns/did/v1')
      expect(doc.id).toBe('did:web:tu.ac.th')
      expect(doc.verificationMethod).toHaveLength(1)
      expect(doc.verificationMethod[0].publicKeyMultibase).toBe('zdGVzdC1wdWJsaWMta2V5')
      expect(doc.verificationMethod[0].type).toBe('Ed25519VerificationKey2020')
      expect(doc.authentication).toContain('did:web:tu.ac.th#key-1')
      expect(doc.assertionMethod).toContain('did:web:tu.ac.th#key-1')
    })

    it('should cache the DID document', async () => {
      await service.getDIDDocument()
      await service.getDIDDocument()
      await service.getDIDDocument()

      // CryptoService should only be called once (cached)
      expect(cryptoService.getPublicKeyMultibase).toHaveBeenCalledTimes(1)
    })

    it('should refresh cache after TTL expires', async () => {
      await service.getDIDDocument()
      expect(cryptoService.getPublicKeyMultibase).toHaveBeenCalledTimes(1)

      // Force cache expiry by invalidating
      service.invalidateCache()

      await service.getDIDDocument()
      expect(cryptoService.getPublicKeyMultibase).toHaveBeenCalledTimes(2)
    })

    it('should use the correct domain from config', async () => {
      const doc = await service.getDIDDocument()

      expect(doc.id).toBe('did:web:tu.ac.th')
      expect(doc.verificationMethod[0].controller).toBe('did:web:tu.ac.th')
    })
  })

  describe('invalidateCache', () => {
    it('should clear cached document', async () => {
      await service.getDIDDocument()
      expect(cryptoService.getPublicKeyMultibase).toHaveBeenCalledTimes(1)

      service.invalidateCache()
      await service.getDIDDocument()

      expect(cryptoService.getPublicKeyMultibase).toHaveBeenCalledTimes(2)
    })
  })
})
