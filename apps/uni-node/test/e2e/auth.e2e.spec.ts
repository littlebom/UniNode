import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AuthController } from '../../src/auth/auth.controller'
import { AuthService } from '../../src/auth/auth.service'
import { createTestApp } from '../helpers/test-app'
import { TOKENS } from '../helpers/auth.helper'

jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

describe('Auth E2E (Node)', () => {
  let app: INestApplication

  const mockAuthService = {
    login: jest.fn(),
    refresh: jest.fn(),
    registerDID: jest.fn(),
  }

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── POST /unilink/api/v1/auth/login ──

  describe('POST /unilink/api/v1/auth/login', () => {
    it('should login student (public)', async () => {
      mockAuthService.login.mockResolvedValue({
        token: 'jwt-token',
        refreshToken: 'refresh-uuid',
        did: 'did:web:tu.ac.th:students:6401001',
      })

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/auth/login')
        .send({ studentId: '6401001', password: 'test123' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.token).toBeDefined()
      expect(res.body.data.refreshToken).toBeDefined()
    })
  })

  // ── POST /unilink/api/v1/auth/refresh ──

  describe('POST /unilink/api/v1/auth/refresh', () => {
    it('should refresh token (public)', async () => {
      mockAuthService.refresh.mockResolvedValue({
        token: 'new-jwt-token',
      })

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/auth/refresh')
        .send({ refreshToken: 'existing-refresh-token' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.token).toBeDefined()
    })
  })

  // ── POST /unilink/api/v1/auth/did/register ──

  describe('POST /unilink/api/v1/auth/did/register', () => {
    it('should register DID (JWT required)', async () => {
      mockAuthService.registerDID.mockResolvedValue({
        did: 'did:web:tu.ac.th:students:6401001',
        publicKey: 'z6Mktest1234567890',
      })

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/auth/did/register')
        .set('Authorization', `Bearer ${TOKENS.student}`)
        .send({
          studentId: '6401001',
          did: 'did:web:tu.ac.th:students:6401001',
          publicKey: 'z6Mktest1234567890',
        })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.did).toContain('did:web:')
    })

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/unilink/api/v1/auth/did/register')
        .send({
          studentId: '6401001',
          did: 'did:web:tu.ac.th:students:6401001',
          publicKey: 'z6Mktest1234567890',
        })
        .expect(401)
    })
  })
})
