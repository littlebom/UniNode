import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { DIDController } from '../../src/did/did.controller'
import { StatusListController } from '../../src/did/status-list.controller'
import { DIDService } from '../../src/did/did.service'
import { StatusListService } from '../../src/vc/status-list.service'
import { createTestApp } from '../helpers/test-app'
import { TEST_DID_DOCUMENT } from '../fixtures/test-data'

jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
  getDIDDocument: jest.fn(),
}))

describe('DID & Status List E2E', () => {
  let app: INestApplication

  const mockDidService = {
    getDIDDocument: jest.fn(),
  }

  const mockStatusListService = {
    getStatusListCredential: jest.fn(),
  }

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [DIDController, StatusListController],
      providers: [
        { provide: DIDService, useValue: mockDidService },
        { provide: StatusListService, useValue: mockStatusListService },
      ],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── GET /.well-known/did.json (public, no prefix) ──

  describe('GET /.well-known/did.json', () => {
    it('should return DID Document without auth', async () => {
      mockDidService.getDIDDocument.mockResolvedValue(TEST_DID_DOCUMENT)

      const res = await request(app.getHttpServer())
        .get('/.well-known/did.json')
        .expect(200)

      expect(res.body.id).toBe('did:web:tu.ac.th')
      expect(res.body.verificationMethod).toBeDefined()
      expect(res.body.verificationMethod).toHaveLength(1)
      expect(res.body.authentication).toContain('did:web:tu.ac.th#key-1')
    })

    it('should set correct content-type', async () => {
      mockDidService.getDIDDocument.mockResolvedValue(TEST_DID_DOCUMENT)

      const res = await request(app.getHttpServer())
        .get('/.well-known/did.json')

      // Controller sets content-type to application/did+json
      expect(res.headers['content-type']).toMatch(/json/)
    })
  })

  // ── GET /.well-known/status-list/:id (public, no prefix) ──

  describe('GET /.well-known/status-list/:id', () => {
    it('should return status list credential without auth', async () => {
      const statusListVC = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'StatusList2021Credential'],
        issuer: 'did:web:tu.ac.th',
        credentialSubject: {
          id: 'https://tu.ac.th/.well-known/status-list/2025-01',
          type: 'StatusList2021',
          statusPurpose: 'revocation',
          encodedList: 'H4sIAAAAAAAA...',
        },
      }
      mockStatusListService.getStatusListCredential.mockResolvedValue(statusListVC)

      const res = await request(app.getHttpServer())
        .get('/.well-known/status-list/2025-01')
        .expect(200)

      expect(res.body.type).toContain('StatusList2021Credential')
      expect(res.body.credentialSubject.statusPurpose).toBe('revocation')
    })
  })
})
