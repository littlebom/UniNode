import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { DIDController } from '../did.controller'
import { DIDService } from '../did.service'
import { createTestApp } from '../../../test/helpers/test-app'
import { TOKENS } from '../../../test/helpers/auth.helper'
import { TEST_DID_DOCUMENT } from '../../../test/fixtures/test-data'

// Mock packages to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
  getDIDDocument: jest.fn(),
}))

describe('DID & Public Endpoints Integration Tests', () => {
  let app: INestApplication

  const mockDIDService = {
    getDIDDocument: jest.fn(),
    invalidateCache: jest.fn(),
  }

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [DIDController],
      providers: [
        { provide: DIDService, useValue: mockDIDService },
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

  // ─── GET /.well-known/did.json (Public) ───────────────

  describe('GET /.well-known/did.json', () => {
    it('should return DID document without authentication', async () => {
      mockDIDService.getDIDDocument.mockResolvedValue(TEST_DID_DOCUMENT)

      const res = await request(app.getHttpServer())
        .get('/.well-known/did.json')
        .expect(200)

      expect(res.body.id).toBe('did:web:tu.ac.th')
      expect(res.body.verificationMethod).toBeDefined()
      expect(res.body.verificationMethod).toHaveLength(1)
      expect(res.body.authentication).toBeDefined()
      expect(res.body.assertionMethod).toBeDefined()
    })

    it('should include proper DID context', async () => {
      mockDIDService.getDIDDocument.mockResolvedValue(TEST_DID_DOCUMENT)

      const res = await request(app.getHttpServer())
        .get('/.well-known/did.json')
        .expect(200)

      expect(res.body['@context']).toContain('https://www.w3.org/ns/did/v1')
    })

    it('should be accessible with any role token too', async () => {
      mockDIDService.getDIDDocument.mockResolvedValue(TEST_DID_DOCUMENT)

      const res = await request(app.getHttpServer())
        .get('/.well-known/did.json')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .expect(200)

      expect(res.body.id).toBe('did:web:tu.ac.th')
    })

    it('should be accessible even with invalid token', async () => {
      mockDIDService.getDIDDocument.mockResolvedValue(TEST_DID_DOCUMENT)

      const res = await request(app.getHttpServer())
        .get('/.well-known/did.json')
        .set('Authorization', 'Bearer some-garbage-token')
        .expect(200)

      expect(res.body.id).toBe('did:web:tu.ac.th')
    })
  })
})
