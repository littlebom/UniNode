import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { VCService } from '../vc.service'
import { VCRepository } from '../vc.repository'
import { StatusListService } from '../status-list.service'
import { CryptoService } from '../../crypto/crypto.service'
import { StudentService } from '../../student/student.service'
import { CourseService } from '../../course/course.service'
import { UniLinkException } from '@unilink/dto'

// Mock packages to avoid ESM dependency issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
  verifyRaw: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn().mockResolvedValue({
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://unilink.ac.th/credentials/v1',
    ],
    id: 'vc-tu-ac-th-cs101-6501234-2567-1',
    type: ['VerifiableCredential', 'CourseCreditCredential'],
    issuer: 'did:web:tu.ac.th',
    issuanceDate: '2026-02-23T10:00:00Z',
    credentialSubject: {
      id: 'did:web:tu.ac.th:students:6501234',
      studentId: '6501234',
      courseId: 'CS101',
    },
    credentialStatus: {
      id: 'https://tu.ac.th/.well-known/status-list/1#0',
      type: 'StatusList2021Entry',
      statusPurpose: 'revocation',
      statusListIndex: '0',
      statusListCredential: 'https://tu.ac.th/.well-known/status-list/1',
    },
    proof: {
      type: 'Ed25519Signature2020',
      created: '2026-02-23T10:00:00Z',
      verificationMethod: 'did:web:tu.ac.th#key-1',
      proofPurpose: 'assertionMethod',
      proofValue: 'mock-proof-value',
    },
  }),
  getDIDDocument: jest.fn(),
  buildStatusListCredential: jest.fn(),
  createStatusList: jest.fn(),
  setRevoked: jest.fn(),
  didWebToUrl: jest.fn(),
  verifyVC: jest.fn(),
  verifyVP: jest.fn(),
  isRevoked: jest.fn(),
}))

describe('VCService', () => {
  let service: VCService
  let vcRepo: jest.Mocked<VCRepository>
  let statusListService: jest.Mocked<StatusListService>
  let cryptoService: jest.Mocked<CryptoService>
  let studentService: jest.Mocked<StudentService>
  let courseService: jest.Mocked<CourseService>

  const mockConfig = {
    get: jest.fn((_key: string, defaultValue?: string) => {
      const values: Record<string, string> = {
        NODE_DOMAIN: 'tu.ac.th',
        NODE_ID: 'tu.ac.th',
      }
      return values[_key] ?? defaultValue
    }),
  }

  const mockStudent = {
    id: 'uuid-1',
    studentId: '6501234',
    did: 'did:web:tu.ac.th:students:6501234',
    walletEndpoint: null,
    fcmToken: null,
    status: 'active',
    enrolledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockVcEntity = {
    id: 'uuid-vc',
    vcId: 'vc-tu-ac-th-cs101-6501234-2567-1',
    studentId: '6501234',
    vcType: 'CourseCreditCredential',
    courseId: 'CS101',
    vcDocument: { id: 'vc-tu-ac-th-cs101-6501234-2567-1' },
    statusIndex: 0,
    status: 'active',
    issuedAt: new Date(),
    revokedAt: null,
    revokeReason: null,
    createdAt: new Date(),
  }

  beforeEach(async () => {
    const mockVcRepo = {
      findByVcId: jest.fn(),
      findByStudentId: jest.fn(),
      create: jest.fn().mockResolvedValue(mockVcEntity),
      updateStatus: jest.fn(),
      existsByVcId: jest.fn().mockResolvedValue(false),
    }

    const mockStatusListSvc = {
      allocateIndex: jest.fn().mockResolvedValue({
        index: 0,
        statusListId: '1',
        statusListUrl: 'https://tu.ac.th/.well-known/status-list/1',
      }),
      revokeAtIndex: jest.fn(),
      getOrCreateStatusList: jest.fn(),
      getStatusListCredential: jest.fn(),
    }

    const mockCryptoSvc = {
      sign: jest.fn().mockResolvedValue('mock-signature'),
      verify: jest.fn(),
      getPublicKey: jest.fn(),
      getPublicKeyMultibase: jest.fn(),
    }

    const mockStudentSvc = {
      findByStudentId: jest.fn().mockResolvedValue(mockStudent),
      findByDid: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }

    const mockCourseSvc = {
      getCourse: jest.fn().mockResolvedValue({
        courseId: 'CS101',
        courseName: 'Introduction to Programming',
        courseNameTH: 'การเขียนโปรแกรมเบื้องต้น',
        credits: 3,
        courseType: 'Lecture + Lab',
        deliveryMode: 'Onsite',
        org: { faculty: 'คณะวิทยาศาสตร์', department: 'ภาควิชาวิทยาการคอมพิวเตอร์' },
        description: 'Introduction to programming concepts',
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VCService,
        { provide: VCRepository, useValue: mockVcRepo },
        { provide: StatusListService, useValue: mockStatusListSvc },
        { provide: CryptoService, useValue: mockCryptoSvc },
        { provide: StudentService, useValue: mockStudentSvc },
        { provide: CourseService, useValue: mockCourseSvc },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()

    service = module.get<VCService>(VCService)
    vcRepo = module.get(VCRepository)
    statusListService = module.get(StatusListService)
    cryptoService = module.get(CryptoService)
    studentService = module.get(StudentService)
    courseService = module.get(CourseService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('issueVC', () => {
    const issueDto = {
      studentId: '6501234',
      courseId: 'CS101',
      grade: 'A',
      gradePoint: 4.0,
      semester: '1',
      academicYear: '2567',
    }

    it('should issue a VC successfully', async () => {
      const result = await service.issueVC(issueDto)

      expect(result.vcId).toBe('vc-tu-ac-th-cs101-6501234-2567-1')
      expect(result.status).toBe('issued')
      expect(result.vc).toBeDefined()
      expect(studentService.findByStudentId).toHaveBeenCalledWith('6501234')
      expect(statusListService.allocateIndex).toHaveBeenCalled()
      expect(vcRepo.create).toHaveBeenCalled()
    })

    it('should throw STUDENT_NOT_FOUND when student does not exist', async () => {
      studentService.findByStudentId.mockRejectedValue(
        new UniLinkException('STUDENT_NOT_FOUND', 404, 'Student not found'),
      )

      await expect(service.issueVC(issueDto)).rejects.toThrow(UniLinkException)
    })

    it('should throw VC_ISSUE_FAILED when VC already exists', async () => {
      vcRepo.existsByVcId.mockResolvedValue(true)

      try {
        await service.issueVC(issueDto)
        fail('Expected UniLinkException')
      } catch (error) {
        expect(error).toBeInstanceOf(UniLinkException)
        expect((error as UniLinkException).code).toBe('VC_ISSUE_FAILED')
      }
    })

    it('should throw VC_ISSUE_FAILED when signing fails', async () => {
      const { createVC: mockCreateVC } = jest.requireMock('@unilink/vc-core')
      mockCreateVC.mockRejectedValue(new Error('Vault connection failed'))

      try {
        await service.issueVC(issueDto)
        fail('Expected UniLinkException')
      } catch (error) {
        expect(error).toBeInstanceOf(UniLinkException)
        expect((error as UniLinkException).code).toBe('VC_ISSUE_FAILED')
      }
    })

    it('should enrich VC with real course data when course is found', async () => {
      // Restore createVC mock (may have been overridden by previous test)
      const { createVC: mockCreateVC } = jest.requireMock('@unilink/vc-core')
      const mockVcResult = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'vc-tu-ac-th-cs101-6501234-2567-1',
        type: ['VerifiableCredential', 'CourseCreditCredential'],
        issuer: 'did:web:tu.ac.th',
        credentialSubject: { id: 'did:web:tu.ac.th:students:6501234' },
        proof: { type: 'Ed25519Signature2020', proofValue: 'mock' },
      }
      mockCreateVC.mockResolvedValue(mockVcResult)

      const result = await service.issueVC(issueDto)

      expect(courseService.getCourse).toHaveBeenCalledWith('CS101')
      expect(result.vc).toBeDefined()
      expect(result.status).toBe('issued')
      // createVC was called — verify credentialSubject includes real course data
      const callArgs = mockCreateVC.mock.calls[0][0]
      expect(callArgs.credentialSubject.courseName).toBe('Introduction to Programming')
      expect(callArgs.credentialSubject.courseNameTH).toBe('การเขียนโปรแกรมเบื้องต้น')
      expect(callArgs.credentialSubject.credits).toBe(3)
    })

    it('should use fallback values when course is not found', async () => {
      // Restore createVC mock (may have been overridden by previous test)
      const { createVC: mockCreateVC } = jest.requireMock('@unilink/vc-core')
      mockCreateVC.mockResolvedValue({
        id: 'vc-tu-ac-th-cs101-6501234-2567-1',
        proof: { proofValue: 'mock' },
      })

      courseService.getCourse.mockRejectedValue(
        new UniLinkException('COURSE_NOT_FOUND', 404, 'Course not found'),
      )

      const result = await service.issueVC(issueDto)

      expect(result.status).toBe('issued')
      // Should still issue VC with fallback values
      const callArgs = mockCreateVC.mock.calls[0][0]
      expect(callArgs.credentialSubject.courseName).toBe('CS101') // fallback to courseId
      expect(callArgs.credentialSubject.credits).toBe(3) // fallback default
    })

    it('should use fallback values when course is inactive', async () => {
      // Restore createVC mock (may have been overridden by previous test)
      const { createVC: mockCreateVC } = jest.requireMock('@unilink/vc-core')
      mockCreateVC.mockResolvedValue({
        id: 'vc-tu-ac-th-cs101-6501234-2567-1',
        proof: { proofValue: 'mock' },
      })

      courseService.getCourse.mockRejectedValue(
        new UniLinkException('COURSE_INACTIVE', 404, 'Course is inactive'),
      )

      const result = await service.issueVC(issueDto)

      expect(result.status).toBe('issued')
      expect(result.vc).toBeDefined()
      // VC issuance should NOT be blocked by inactive course
      expect(vcRepo.create).toHaveBeenCalled()
    })
  })

  describe('getVC', () => {
    it('should return VC when found', async () => {
      vcRepo.findByVcId.mockResolvedValue(mockVcEntity)

      const result = await service.getVC('vc-tu-ac-th-cs101-6501234-2567-1')

      expect(result.vcId).toBe('vc-tu-ac-th-cs101-6501234-2567-1')
      expect(result.status).toBe('active')
      expect(result.vc).toBeDefined()
    })

    it('should throw VC_NOT_FOUND when VC does not exist', async () => {
      vcRepo.findByVcId.mockResolvedValue(null)

      await expect(service.getVC('nonexistent')).rejects.toThrow(UniLinkException)
      await expect(service.getVC('nonexistent')).rejects.toMatchObject({
        code: 'VC_NOT_FOUND',
      })
    })
  })

  describe('revokeVC', () => {
    it('should revoke a VC successfully', async () => {
      vcRepo.findByVcId.mockResolvedValue(mockVcEntity)
      vcRepo.updateStatus.mockResolvedValue({
        ...mockVcEntity,
        status: 'revoked',
        revokedAt: new Date(),
        revokeReason: 'Grade error',
      })

      const result = await service.revokeVC(
        'vc-tu-ac-th-cs101-6501234-2567-1',
        'Grade error',
      )

      expect(result.vcId).toBe('vc-tu-ac-th-cs101-6501234-2567-1')
      expect(result.status).toBe('revoked')
      expect(statusListService.revokeAtIndex).toHaveBeenCalledWith('1', 0)
      expect(vcRepo.updateStatus).toHaveBeenCalledWith(
        'vc-tu-ac-th-cs101-6501234-2567-1',
        'revoked',
        'Grade error',
      )
    })

    it('should throw VC_NOT_FOUND when VC does not exist', async () => {
      vcRepo.findByVcId.mockResolvedValue(null)

      await expect(
        service.revokeVC('nonexistent', 'reason'),
      ).rejects.toMatchObject({ code: 'VC_NOT_FOUND' })
    })

    it('should throw VC_ALREADY_REVOKED when VC is already revoked', async () => {
      vcRepo.findByVcId.mockResolvedValue({
        ...mockVcEntity,
        status: 'revoked',
      })

      await expect(
        service.revokeVC('vc-tu-ac-th-cs101-6501234-2567-1', 'reason'),
      ).rejects.toMatchObject({ code: 'VC_ALREADY_REVOKED' })
    })
  })

  describe('generateChallenge', () => {
    it('should return a challenge with expiresAt', () => {
      const result = service.generateChallenge('tu.ac.th')

      expect(result.challenge).toBeDefined()
      expect(result.challenge).toHaveLength(36) // UUID format
      expect(result.expiresAt).toBeDefined()
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now())
    })

    it('should generate unique challenges', () => {
      const c1 = service.generateChallenge('tu.ac.th')
      const c2 = service.generateChallenge('tu.ac.th')

      expect(c1.challenge).not.toBe(c2.challenge)
    })
  })

  describe('validateChallenge', () => {
    it('should validate a valid challenge', () => {
      const { challenge } = service.generateChallenge('tu.ac.th')

      expect(service.validateChallenge(challenge, 'tu.ac.th')).toBe(true)
    })

    it('should reject consumed challenge (one-time use)', () => {
      const { challenge } = service.generateChallenge('tu.ac.th')

      expect(service.validateChallenge(challenge, 'tu.ac.th')).toBe(true)
      expect(service.validateChallenge(challenge, 'tu.ac.th')).toBe(false)
    })

    it('should reject challenge with wrong domain', () => {
      const { challenge } = service.generateChallenge('tu.ac.th')

      expect(service.validateChallenge(challenge, 'chula.ac.th')).toBe(false)
    })

    it('should reject unknown challenge', () => {
      expect(service.validateChallenge('unknown-challenge', 'tu.ac.th')).toBe(false)
    })
  })
})
