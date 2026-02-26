import { Test, TestingModule } from '@nestjs/testing'
import { DIDController } from '../did.controller'
import { DIDService } from '../did.service'

// Mock packages to avoid ESM dependency issues (@noble/ed25519)
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  getDIDDocument: jest.fn(),
}))

interface DIDDocument {
  '@context': string[]
  id: string
  verificationMethod: {
    id: string
    type: string
    controller: string
    publicKeyMultibase: string
  }[]
  authentication: string[]
  assertionMethod: string[]
}

describe('DIDController', () => {
  let controller: DIDController
  let didService: jest.Mocked<DIDService>

  const mockDIDDocument: DIDDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed2020/v1',
    ],
    id: 'did:web:tu.ac.th',
    verificationMethod: [
      {
        id: 'did:web:tu.ac.th#key-1',
        type: 'Ed25519VerificationKey2020',
        controller: 'did:web:tu.ac.th',
        publicKeyMultibase: 'zdGVzdC1wdWJsaWMta2V5',
      },
    ],
    authentication: ['did:web:tu.ac.th#key-1'],
    assertionMethod: ['did:web:tu.ac.th#key-1'],
  }

  beforeEach(async () => {
    const mockDidService = {
      getDIDDocument: jest.fn().mockResolvedValue(mockDIDDocument),
      invalidateCache: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DIDController],
      providers: [
        { provide: DIDService, useValue: mockDidService },
      ],
    }).compile()

    controller = module.get<DIDController>(DIDController)
    didService = module.get(DIDService)
  })

  describe('GET /.well-known/did.json', () => {
    it('should return DID document', async () => {
      const result = await controller.getDIDDocument()

      expect(result).toEqual(mockDIDDocument)
      expect(didService.getDIDDocument).toHaveBeenCalled()
    })

    it('should return correct DID context', async () => {
      const result = await controller.getDIDDocument()

      expect(result['@context']).toContain('https://www.w3.org/ns/did/v1')
    })
  })
})
