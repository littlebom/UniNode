import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../auth.service'
import { StudentService } from '../../student/student.service'
import { StudentEntity } from '../../student/student.entity'
import { UniLinkException } from '@unilink/dto'

describe('AuthService', () => {
  let authService: AuthService
  let jwtService: jest.Mocked<JwtService>
  let configService: jest.Mocked<ConfigService>
  let studentService: jest.Mocked<StudentService>

  const mockStudent: StudentEntity = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    studentId: '6501234',
    did: 'did:web:tu.ac.th:students:6501234',
    walletEndpoint: null,
    fcmToken: null,
    publicKey: null,
    status: 'active',
    enrolledAt: new Date('2025-06-01'),
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01'),
  }

  beforeEach(async () => {
    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn(),
    }

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    }

    const mockStudentService = {
      findByStudentId: jest.fn(),
      update: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: StudentService, useValue: mockStudentService },
      ],
    }).compile()

    authService = module.get<AuthService>(AuthService)
    jwtService = module.get(JwtService)
    configService = module.get(ConfigService)
    studentService = module.get(StudentService)
  })

  describe('login', () => {
    it('should return tokens and DID for active student', async () => {
      studentService.findByStudentId.mockResolvedValue(mockStudent)
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token')

      const result = await authService.login('6501234', 'password123')

      expect(result).toEqual({
        token: 'access-token',
        refreshToken: 'refresh-token',
        did: 'did:web:tu.ac.th:students:6501234',
      })
      expect(studentService.findByStudentId).toHaveBeenCalledWith('6501234')
      expect(jwtService.sign).toHaveBeenCalledTimes(2)
    })

    it('should sign access token with correct payload', async () => {
      studentService.findByStudentId.mockResolvedValue(mockStudent)

      await authService.login('6501234', 'password123')

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '550e8400-e29b-41d4-a716-446655440000',
        studentId: '6501234',
        role: 'student',
      })
    })

    it('should sign refresh token with refresh secret and 7d expiry', async () => {
      studentService.findByStudentId.mockResolvedValue(mockStudent)

      await authService.login('6501234', 'password123')

      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: '550e8400-e29b-41d4-a716-446655440000',
          studentId: '6501234',
          role: 'student',
        },
        {
          secret: 'test-jwt-secret:refresh',
          expiresIn: '7d',
        },
      )
    })

    it('should return null DID when student has no DID', async () => {
      const studentNoDid = { ...mockStudent, did: null }
      studentService.findByStudentId.mockResolvedValue(studentNoDid)

      const result = await authService.login('6501234', 'password123')

      expect(result.did).toBeNull()
    })

    it('should throw STUDENT_INACTIVE for non-active students', async () => {
      const inactiveStudent = { ...mockStudent, status: 'inactive' }
      studentService.findByStudentId.mockResolvedValue(inactiveStudent)

      await expect(authService.login('6501234', 'password123')).rejects.toThrow(
        UniLinkException,
      )
      await expect(
        authService.login('6501234', 'password123'),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'STUDENT_INACTIVE',
      })
    })

    it('should throw STUDENT_NOT_FOUND when student does not exist', async () => {
      studentService.findByStudentId.mockRejectedValue(
        new UniLinkException('STUDENT_NOT_FOUND', 404, 'Not found'),
      )

      await expect(
        authService.login('9999999', 'password123'),
      ).rejects.toThrow(UniLinkException)
    })
  })

  describe('refresh', () => {
    it('should return new access token for valid refresh token', async () => {
      jwtService.verify.mockReturnValue({
        sub: '550e8400-e29b-41d4-a716-446655440000',
        studentId: '6501234',
        role: 'student',
        iat: 1000,
        exp: 2000,
      })
      jwtService.sign.mockReturnValue('new-access-token')

      const result = await authService.refresh('valid-refresh-token')

      expect(result).toEqual({ token: 'new-access-token' })
      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-jwt-secret:refresh',
      })
    })

    it('should sign new token without iat/exp from old payload', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'uuid-123',
        studentId: '6501234',
        role: 'student',
        iat: 1000,
        exp: 2000,
      })

      await authService.refresh('valid-refresh-token')

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'uuid-123',
        studentId: '6501234',
        role: 'student',
      })
    })

    it('should throw AUTH_REFRESH_INVALID for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired')
      })

      await expect(authService.refresh('expired-token')).rejects.toThrow(
        UniLinkException,
      )
      await expect(
        authService.refresh('expired-token'),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'AUTH_REFRESH_INVALID',
      })
    })
  })

  describe('registerDID', () => {
    const did = 'did:web:tu.ac.th:students:6501234'
    const publicKey = 'zBase64EncodedPublicKey'

    it('should register DID and publicKey for student', async () => {
      const studentNoDid = { ...mockStudent, did: null, publicKey: null }
      studentService.findByStudentId.mockResolvedValue(studentNoDid)
      studentService.update.mockResolvedValue({
        ...studentNoDid,
        did,
        publicKey,
      })

      const result = await authService.registerDID(
        '6501234',
        '6501234',
        did,
        publicKey,
      )

      expect(result).toEqual({ did, publicKey })
      expect(studentService.update).toHaveBeenCalledWith('6501234', {
        did,
        publicKey,
      })
    })

    it('should allow re-registering same DID', async () => {
      const studentWithDid = { ...mockStudent, did, publicKey }
      studentService.findByStudentId.mockResolvedValue(studentWithDid)
      studentService.update.mockResolvedValue(studentWithDid)

      const result = await authService.registerDID(
        '6501234',
        '6501234',
        did,
        publicKey,
      )

      expect(result).toEqual({ did, publicKey })
    })

    it('should throw STUDENT_DID_MISMATCH when registering DID for another student', async () => {
      await expect(
        authService.registerDID('6501234', '6509999', did, publicKey),
      ).rejects.toThrow(UniLinkException)
      await expect(
        authService.registerDID('6501234', '6509999', did, publicKey),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'STUDENT_DID_MISMATCH',
      })
    })

    it('should throw INVALID_DID_FORMAT when DID studentId does not match', async () => {
      const mismatchDid = 'did:web:tu.ac.th:students:9999999'

      await expect(
        authService.registerDID('6501234', '6501234', mismatchDid, publicKey),
      ).rejects.toThrow(UniLinkException)
      await expect(
        authService.registerDID('6501234', '6501234', mismatchDid, publicKey),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_DID_FORMAT',
      })
    })

    it('should throw STUDENT_DID_MISMATCH when student already has different DID', async () => {
      const studentWithDifferentDid = {
        ...mockStudent,
        did: 'did:web:cu.ac.th:students:6501234',
      }
      studentService.findByStudentId.mockResolvedValue(studentWithDifferentDid)

      await expect(
        authService.registerDID('6501234', '6501234', did, publicKey),
      ).rejects.toThrow(UniLinkException)
      await expect(
        authService.registerDID('6501234', '6501234', did, publicKey),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'STUDENT_DID_MISMATCH',
      })
    })
  })
})
