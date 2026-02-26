import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { VCService } from '../vc.service'
import { VCRepository } from '../vc.repository'
import { StatusListService } from '../status-list.service'
import { CryptoService } from '../../crypto/crypto.service'
import { StudentService } from '../../student/student.service'
import { CourseService } from '../../course/course.service'
import { UniLinkException } from '@unilink/dto'
import type { VerifiablePresentation, VerifiableCredential } from '@unilink/dto'

// Mock @unilink/crypto
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
  verifyRaw: jest.fn().mockResolvedValue(true),
}))

// Mock @unilink/vc-core
const mockVerifyVP = jest.fn()
const mockVerifyVC = jest.fn()
const mockIsRevoked = jest.fn()
const mockDidWebToUrl = jest.fn()

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn().mockResolvedValue({
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'vc-test',
    type: ['VerifiableCredential'],
    issuer: 'did:web:tu.ac.th',
    issuanceDate: '2025-01-01T00:00:00Z',
    credentialSubject: { id: 'did:web:tu.ac.th:students:6501234' },
    proof: {
      type: 'Ed25519Signature2020',
      created: '2025-01-01T00:00:00Z',
      verificationMethod: 'did:web:tu.ac.th#key-1',
      proofPurpose: 'assertionMethod',
      proofValue: 'mock-sig',
    },
  }),
  verifyVP: (...args: unknown[]) => mockVerifyVP(...args),
  verifyVC: (...args: unknown[]) => mockVerifyVC(...args),
  isRevoked: (...args: unknown[]) => mockIsRevoked(...args),
  didWebToUrl: (...args: unknown[]) => mockDidWebToUrl(...args),
}))

// Mock global fetch
const mockFetch = jest.fn() as jest.Mock
global.fetch = mockFetch

describe('VCService — verifyPresentation', () => {
  let service: VCService

  const mockVcRepo = {
    findByVcId: jest.fn(),
    existsByVcId: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    countByVcIdPrefix: jest.fn(),
  }

  const mockStatusListService = {
    allocateIndex: jest.fn().mockResolvedValue({ index: 0, statusListUrl: 'https://tu.ac.th/.well-known/status-list/1' }),
    revokeAtIndex: jest.fn(),
  }

  const mockCryptoService = {
    sign: jest.fn().mockResolvedValue('mock-signature'),
    verify: jest.fn().mockResolvedValue(true),
    getPublicKey: jest.fn().mockResolvedValue('mock-pubkey'),
    getPublicKeyMultibase: jest.fn().mockResolvedValue('zMockPubKey'),
    onModuleInit: jest.fn(),
  }

  const mockStudentService = {
    findByStudentId: jest.fn().mockResolvedValue({
      id: 'uuid-1',
      studentId: '6501234',
      did: 'did:web:tu.ac.th:students:6501234',
    }),
    create: jest.fn(),
  }

  const mockCourseService = {
    getCourse: jest.fn().mockResolvedValue({
      courseId: 'CS101',
      courseName: 'Introduction to Programming',
      courseNameTH: 'การเขียนโปรแกรมเบื้องต้น',
      credits: 3,
      isActive: true,
    }),
    listCourses: jest.fn(),
    searchCourses: jest.fn(),
    getOutcomes: jest.fn(),
    getSyllabus: jest.fn(),
    verifyCourseIntegrity: jest.fn(),
    getSchemaOrg: jest.fn(),
    calculateLOMatch: jest.fn(),
  }

  const mockConfigService = {
    get: jest.fn((key: string, def?: string) => {
      const map: Record<string, string> = {
        NODE_DOMAIN: 'tu.ac.th',
        NODE_ID: 'tu.ac.th',
      }
      return map[key] ?? def
    }),
    getOrThrow: jest.fn(),
  }

  const mockVc: VerifiableCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://unilink.ac.th/credentials/v1',
    ],
    id: 'vc-tu-cs101-6501234-2567-1',
    type: ['VerifiableCredential', 'CourseCreditCredential'],
    issuer: 'did:web:tu.ac.th',
    issuanceDate: '2025-01-01T00:00:00Z',
    credentialSubject: {
      id: 'did:web:tu.ac.th:students:6501234',
      studentId: '6501234',
    },
    proof: {
      type: 'Ed25519Signature2020',
      created: '2025-01-01T00:00:00Z',
      verificationMethod: 'did:web:tu.ac.th#key-1',
      proofPurpose: 'assertionMethod',
      proofValue: 'vc-sig-base64url',
    },
  }

  const mockVp: VerifiablePresentation = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiablePresentation'],
    holder: 'did:web:tu.ac.th:students:6501234',
    verifiableCredential: [mockVc],
    proof: {
      type: 'Ed25519Signature2020',
      created: '2025-01-01T00:00:00Z',
      verificationMethod: 'did:web:tu.ac.th:students:6501234#key-1',
      proofPurpose: 'authentication',
      proofValue: 'vp-sig-base64url',
      challenge: 'test-challenge-uuid',
      domain: 'verifier.ac.th',
    },
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VCService,
        { provide: VCRepository, useValue: mockVcRepo },
        { provide: StatusListService, useValue: mockStatusListService },
        { provide: CryptoService, useValue: mockCryptoService },
        { provide: StudentService, useValue: mockStudentService },
        { provide: CourseService, useValue: mockCourseService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<VCService>(VCService)

    // Setup default mock for verifyVP
    mockVerifyVP.mockResolvedValue({
      isValid: true,
      holder: 'did:web:tu.ac.th:students:6501234',
      credentials: [
        {
          isValid: true,
          isRevoked: false,
          isExpired: false,
          holder: 'did:web:tu.ac.th:students:6501234',
        },
      ],
    })

    mockDidWebToUrl.mockReturnValue('https://tu.ac.th/.well-known/did.json')
  })

  describe('verifyPresentation', () => {
    it('should throw VP_CHALLENGE_EXPIRED when challenge is invalid', async () => {
      // Do NOT set up a challenge → validateChallenge will return false
      await expect(
        service.verifyPresentation(mockVp, 'invalid-challenge', 'verifier.ac.th'),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.verifyPresentation(mockVp, 'invalid-challenge', 'verifier.ac.th')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('VP_CHALLENGE_EXPIRED')
      }
    })

    it('should verify a valid VP after challenge is generated', async () => {
      // Generate a challenge first
      const { challenge } = service.generateChallenge('verifier.ac.th')

      const result = await service.verifyPresentation(
        mockVp,
        challenge,
        'verifier.ac.th',
      )

      expect(result.isValid).toBe(true)
      expect(result.holder).toBe('did:web:tu.ac.th:students:6501234')
      expect(mockVerifyVP).toHaveBeenCalledTimes(1)
    })

    it('should pass challenge and domain to verifyVP', async () => {
      const { challenge } = service.generateChallenge('verifier.ac.th')

      await service.verifyPresentation(mockVp, challenge, 'verifier.ac.th')

      const [_vp, options] = mockVerifyVP.mock.calls[0]
      expect(options.challenge).toBe(challenge)
      expect(options.domain).toBe('verifier.ac.th')
      expect(typeof options.verifyHolderFn).toBe('function')
      expect(typeof options.verifyVcFn).toBe('function')
    })

    it('should reject expired challenge', async () => {
      // Generate challenge then immediately consume it
      const { challenge } = service.generateChallenge('verifier.ac.th')
      service.validateChallenge(challenge, 'verifier.ac.th') // consume

      await expect(
        service.verifyPresentation(mockVp, challenge, 'verifier.ac.th'),
      ).rejects.toThrow(UniLinkException)
    })

    it('should return invalid when VP verification fails', async () => {
      mockVerifyVP.mockResolvedValue({
        isValid: false,
        holder: 'did:web:tu.ac.th:students:6501234',
        credentials: [],
        error: 'Invalid holder signature',
      })

      const { challenge } = service.generateChallenge('verifier.ac.th')
      const result = await service.verifyPresentation(
        mockVp,
        challenge,
        'verifier.ac.th',
      )

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid holder signature')
    })

    it('should return credentials with revocation status', async () => {
      mockVerifyVP.mockResolvedValue({
        isValid: true,
        holder: 'did:web:tu.ac.th:students:6501234',
        credentials: [
          {
            isValid: true,
            isRevoked: true,
            isExpired: false,
            holder: 'did:web:tu.ac.th:students:6501234',
            error: 'VC has been revoked',
          },
        ],
      })

      const { challenge } = service.generateChallenge('verifier.ac.th')
      const result = await service.verifyPresentation(
        mockVp,
        challenge,
        'verifier.ac.th',
      )

      expect(result.credentials[0].isRevoked).toBe(true)
    })
  })

  describe('resolvePublicKey', () => {
    it('should resolve DID document and extract public key', async () => {
      mockDidWebToUrl.mockReturnValue('https://tu.ac.th/.well-known/did.json')
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          '@context': ['https://www.w3.org/ns/did/v1'],
          id: 'did:web:tu.ac.th',
          verificationMethod: [
            {
              id: 'did:web:tu.ac.th#key-1',
              type: 'Ed25519VerificationKey2020',
              controller: 'did:web:tu.ac.th',
              publicKeyMultibase: 'zResolvedPubKey123',
            },
          ],
          authentication: ['did:web:tu.ac.th#key-1'],
          assertionMethod: ['did:web:tu.ac.th#key-1'],
        }),
      })

      const pubKey = await service.resolvePublicKey('did:web:tu.ac.th#key-1')

      expect(pubKey).toBe('zResolvedPubKey123')
      expect(mockDidWebToUrl).toHaveBeenCalledWith('did:web:tu.ac.th')
      expect(mockFetch).toHaveBeenCalledWith('https://tu.ac.th/.well-known/did.json')
    })

    it('should throw VC_ISSUER_UNKNOWN when fetch fails', async () => {
      mockDidWebToUrl.mockReturnValue('https://unknown.ac.th/.well-known/did.json')
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      })

      await expect(
        service.resolvePublicKey('did:web:unknown.ac.th#key-1'),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.resolvePublicKey('did:web:unknown.ac.th#key-1')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('VC_ISSUER_UNKNOWN')
      }
    })

    it('should throw VC_SIGNATURE_INVALID when verificationMethod not found in DID doc', async () => {
      mockDidWebToUrl.mockReturnValue('https://tu.ac.th/.well-known/did.json')
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          '@context': ['https://www.w3.org/ns/did/v1'],
          id: 'did:web:tu.ac.th',
          verificationMethod: [
            {
              id: 'did:web:tu.ac.th#key-1',
              type: 'Ed25519VerificationKey2020',
              controller: 'did:web:tu.ac.th',
              publicKeyMultibase: 'zPubKey',
            },
          ],
          authentication: [],
          assertionMethod: [],
        }),
      })

      await expect(
        service.resolvePublicKey('did:web:tu.ac.th#key-999'),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.resolvePublicKey('did:web:tu.ac.th#key-999')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('VC_SIGNATURE_INVALID')
      }
    })
  })

  describe('fetchStatusList', () => {
    it('should fetch and return status list credential', async () => {
      const mockStatusList = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://tu.ac.th/.well-known/status-list/1',
        type: ['VerifiableCredential', 'StatusList2021Credential'],
        issuer: 'did:web:tu.ac.th',
        issuanceDate: '2025-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://tu.ac.th/.well-known/status-list/1#list',
          type: 'StatusList2021',
          statusPurpose: 'revocation',
          encodedList: 'H4sIAAAAAAAAA-encoded-list',
        },
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockStatusList),
      })

      const result = await service.fetchStatusList(
        'https://tu.ac.th/.well-known/status-list/1',
      )

      expect(result).toEqual(mockStatusList)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://tu.ac.th/.well-known/status-list/1',
      )
    })

    it('should throw SERVICE_UNAVAILABLE when fetch fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      })

      await expect(
        service.fetchStatusList('https://tu.ac.th/.well-known/status-list/1'),
      ).rejects.toThrow(UniLinkException)

      try {
        await service.fetchStatusList('https://tu.ac.th/.well-known/status-list/1')
      } catch (e) {
        expect((e as UniLinkException).code).toBe('SERVICE_UNAVAILABLE')
      }
    })
  })
})
