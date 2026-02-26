import { Test, TestingModule } from '@nestjs/testing'
import { StudentService } from '../student.service'
import { StudentRepository } from '../student.repository'
import { StudentEntity } from '../student.entity'
import { UniLinkException } from '@unilink/dto'

describe('StudentService', () => {
  let service: StudentService
  let repository: jest.Mocked<StudentRepository>

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
    const mockRepo = {
      findAll: jest.fn(),
      findByStudentId: jest.fn(),
      findByDid: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      existsByStudentId: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        { provide: StudentRepository, useValue: mockRepo },
      ],
    }).compile()

    service = module.get<StudentService>(StudentService)
    repository = module.get(StudentRepository)
  })

  describe('findAll', () => {
    it('should return paginated students', async () => {
      repository.findAll.mockResolvedValue({
        data: [mockStudent],
        total: 1,
      })

      const result = await service.findAll({ page: 1, limit: 20 })

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(repository.findAll).toHaveBeenCalledWith({
        status: undefined,
        page: 1,
        limit: 20,
      })
    })

    it('should filter by status', async () => {
      repository.findAll.mockResolvedValue({ data: [], total: 0 })

      await service.findAll({ status: 'active' })

      expect(repository.findAll).toHaveBeenCalledWith({
        status: 'active',
        page: 1,
        limit: 20,
      })
    })
  })

  describe('findByStudentId', () => {
    it('should return student when found', async () => {
      repository.findByStudentId.mockResolvedValue(mockStudent)

      const result = await service.findByStudentId('6501234')

      expect(result).toEqual(mockStudent)
      expect(repository.findByStudentId).toHaveBeenCalledWith('6501234')
    })

    it('should throw UniLinkException when student not found', async () => {
      repository.findByStudentId.mockResolvedValue(null)

      await expect(service.findByStudentId('9999999')).rejects.toThrow(
        UniLinkException,
      )
      await expect(service.findByStudentId('9999999')).rejects.toMatchObject({
        statusCode: 404,
        code: 'STUDENT_NOT_FOUND',
      })
    })
  })

  describe('findByDid', () => {
    it('should return student when found by DID', async () => {
      repository.findByDid.mockResolvedValue(mockStudent)

      const result = await service.findByDid('did:web:tu.ac.th:students:6501234')

      expect(result).toEqual(mockStudent)
    })

    it('should throw when student DID not found', async () => {
      repository.findByDid.mockResolvedValue(null)

      await expect(
        service.findByDid('did:web:tu.ac.th:students:nonexistent'),
      ).rejects.toThrow(UniLinkException)
    })
  })

  describe('create', () => {
    it('should create a new student', async () => {
      repository.existsByStudentId.mockResolvedValue(false)
      repository.create.mockResolvedValue(mockStudent)

      const result = await service.create({
        studentId: '6501234',
        did: 'did:web:tu.ac.th:students:6501234',
      })

      expect(result).toEqual(mockStudent)
      expect(repository.create).toHaveBeenCalledWith({
        studentId: '6501234',
        did: 'did:web:tu.ac.th:students:6501234',
        walletEndpoint: null,
        fcmToken: null,
        status: 'active',
      })
    })

    it('should throw when student already exists', async () => {
      repository.existsByStudentId.mockResolvedValue(true)

      await expect(
        service.create({ studentId: '6501234' }),
      ).rejects.toThrow(UniLinkException)
      await expect(
        service.create({ studentId: '6501234' }),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'STUDENT_ALREADY_EXISTS',
      })
    })
  })

  describe('update', () => {
    it('should update an existing student', async () => {
      const updatedStudent = { ...mockStudent, status: 'inactive' }
      repository.findByStudentId.mockResolvedValue(mockStudent)
      repository.update.mockResolvedValue(updatedStudent)

      const result = await service.update('6501234', { status: 'inactive' })

      expect(result.status).toBe('inactive')
      expect(repository.update).toHaveBeenCalledWith('6501234', { status: 'inactive' })
    })

    it('should throw when updating non-existent student', async () => {
      repository.findByStudentId.mockResolvedValue(null)

      await expect(
        service.update('9999999', { status: 'inactive' }),
      ).rejects.toThrow(UniLinkException)
    })
  })
})
