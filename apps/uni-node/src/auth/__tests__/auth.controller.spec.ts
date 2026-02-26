import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from '../auth.controller'
import { AuthService, LoginResult, RefreshResult } from '../auth.service'
import { JwtAuthGuard } from '../jwt-auth.guard'

describe('AuthController', () => {
  let controller: AuthController
  let authService: jest.Mocked<AuthService>

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      refresh: jest.fn(),
      registerDID: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (): boolean => true })
      .compile()

    controller = module.get<AuthController>(AuthController)
    authService = module.get(AuthService)
  })

  describe('POST /auth/login', () => {
    it('should return success with tokens and DID', async () => {
      const loginResult: LoginResult = {
        token: 'access-token',
        refreshToken: 'refresh-token',
        did: 'did:web:tu.ac.th:students:6501234',
      }
      authService.login.mockResolvedValue(loginResult)

      const result = await controller.login({
        studentId: '6501234',
        password: 'password123',
      })

      expect(result).toEqual({
        success: true,
        data: loginResult,
      })
      expect(authService.login).toHaveBeenCalledWith('6501234', 'password123')
    })

    it('should return null DID when student has no DID', async () => {
      const loginResult: LoginResult = {
        token: 'access-token',
        refreshToken: 'refresh-token',
        did: null,
      }
      authService.login.mockResolvedValue(loginResult)

      const result = await controller.login({
        studentId: '6501234',
        password: 'password123',
      })

      expect(result.data.did).toBeNull()
    })
  })

  describe('POST /auth/refresh', () => {
    it('should return success with new token', async () => {
      const refreshResult: RefreshResult = { token: 'new-access-token' }
      authService.refresh.mockResolvedValue(refreshResult)

      const result = await controller.refresh({
        refreshToken: 'valid-refresh-token',
      })

      expect(result).toEqual({
        success: true,
        data: refreshResult,
      })
      expect(authService.refresh).toHaveBeenCalledWith('valid-refresh-token')
    })
  })

  describe('POST /auth/did/register', () => {
    it('should return success with DID and publicKey', async () => {
      const did = 'did:web:tu.ac.th:students:6501234'
      const publicKey = 'zBase64EncodedPublicKey'
      authService.registerDID.mockResolvedValue({ did, publicKey })

      const result = await controller.registerDID(
        { sub: 'uuid-123', studentId: '6501234', role: 'student' },
        { studentId: '6501234', did, publicKey },
      )

      expect(result).toEqual({
        success: true,
        data: { did, publicKey },
      })
      expect(authService.registerDID).toHaveBeenCalledWith(
        '6501234',
        '6501234',
        did,
        publicKey,
      )
    })

    it('should pass authenticated studentId to service', async () => {
      authService.registerDID.mockResolvedValue({
        did: 'did:web:tu.ac.th:students:6501234',
        publicKey: 'zkey',
      })

      await controller.registerDID(
        { sub: 'uuid-123', studentId: '6501234', role: 'student' },
        {
          studentId: '6501234',
          did: 'did:web:tu.ac.th:students:6501234',
          publicKey: 'zkey',
        },
      )

      expect(authService.registerDID).toHaveBeenCalledWith(
        '6501234',
        '6501234',
        'did:web:tu.ac.th:students:6501234',
        'zkey',
      )
    })
  })
})
