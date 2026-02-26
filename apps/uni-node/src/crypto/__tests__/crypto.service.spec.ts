import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { CryptoService } from '../crypto.service'

// Mock VaultCrypto
const mockSign = jest.fn()
const mockVerify = jest.fn()
const mockGetPublicKey = jest.fn()

jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn().mockImplementation(() => ({
    sign: mockSign,
    verify: mockVerify,
    getPublicKey: mockGetPublicKey,
  })),
}))

describe('CryptoService', () => {
  let service: CryptoService

  const mockConfig = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        VAULT_URL: 'http://localhost:8200',
        VAULT_TOKEN: 'dev-root-token',
        VAULT_SIGNING_KEY_PATH: 'tu-ac-th',
      }
      return values[key]
    }),
    get: jest.fn((_key: string, defaultValue: string) => defaultValue),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    mockGetPublicKey.mockResolvedValue('dGVzdC1wdWJsaWMta2V5LWJhc2U2NA==')

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()

    service = module.get<CryptoService>(CryptoService)
  })

  describe('onModuleInit', () => {
    it('should initialize VaultCrypto and verify connectivity', async () => {
      await service.onModuleInit()

      expect(mockConfig.getOrThrow).toHaveBeenCalledWith('VAULT_URL')
      expect(mockConfig.getOrThrow).toHaveBeenCalledWith('VAULT_TOKEN')
      expect(mockConfig.getOrThrow).toHaveBeenCalledWith('VAULT_SIGNING_KEY_PATH')
      expect(mockGetPublicKey).toHaveBeenCalled()
    })

    it('should throw when Vault is unreachable', async () => {
      mockGetPublicKey.mockRejectedValueOnce(new Error('Connection refused'))

      await expect(service.onModuleInit()).rejects.toThrow('Connection refused')
    })
  })

  describe('sign', () => {
    it('should delegate to VaultCrypto.sign', async () => {
      await service.onModuleInit()
      mockSign.mockResolvedValue('base64-signature')

      const result = await service.sign('test-data')

      expect(mockSign).toHaveBeenCalledWith('test-data')
      expect(result).toBe('base64-signature')
    })
  })

  describe('verify', () => {
    it('should delegate to VaultCrypto.verify', async () => {
      await service.onModuleInit()
      mockVerify.mockResolvedValue(true)

      const result = await service.verify('test-data', 'base64-signature')

      expect(mockVerify).toHaveBeenCalledWith('test-data', 'base64-signature')
      expect(result).toBe(true)
    })

    it('should return false for invalid signature', async () => {
      await service.onModuleInit()
      mockVerify.mockResolvedValue(false)

      const result = await service.verify('test-data', 'invalid-sig')

      expect(result).toBe(false)
    })
  })

  describe('getPublicKey', () => {
    it('should return base64 public key from Vault', async () => {
      await service.onModuleInit()
      mockGetPublicKey.mockResolvedValue('dGVzdC1wdWJsaWMta2V5LWJhc2U2NA==')

      const result = await service.getPublicKey()

      expect(result).toBe('dGVzdC1wdWJsaWMta2V5LWJhc2U2NA==')
    })
  })

  describe('getPublicKeyMultibase', () => {
    it('should return multibase format (z + base64)', async () => {
      await service.onModuleInit()
      mockGetPublicKey.mockResolvedValue('dGVzdC1wdWJsaWMta2V5LWJhc2U2NA==')

      const result = await service.getPublicKeyMultibase()

      expect(result).toBe('zdGVzdC1wdWJsaWMta2V5LWJhc2U2NA==')
      expect(result.startsWith('z')).toBe(true)
    })
  })
})
