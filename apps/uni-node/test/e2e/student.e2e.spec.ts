import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { StudentController } from '../../src/student/student.controller'
import { StudentService } from '../../src/student/student.service'
import { createTestApp } from '../helpers/test-app'
import { TOKENS } from '../helpers/auth.helper'
import { TEST_STUDENT } from '../fixtures/test-data'

jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

describe('Student E2E', () => {
  let app: INestApplication

  const mockStudentService = {
    findAll: jest.fn(),
    findByStudentId: jest.fn(),
  }

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [StudentController],
      providers: [{ provide: StudentService, useValue: mockStudentService }],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── GET /unilink/api/v1/students ──

  describe('GET /unilink/api/v1/students', () => {
    it('should list students with pagination', async () => {
      const studentEntity = {
        ...TEST_STUDENT,
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'active',
        enrolledAt: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      }
      mockStudentService.findAll.mockResolvedValue({
        data: [studentEntity],
        total: 1,
        page: 1,
        limit: 20,
      })

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/students')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.data).toHaveLength(1)
      expect(res.body.data.data[0].studentId).toBe('6401001')
    })

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/unilink/api/v1/students')
        .expect(401)
    })
  })

  // ── GET /unilink/api/v1/students/:studentId ──

  describe('GET /unilink/api/v1/students/:studentId', () => {
    it('should return student details', async () => {
      const studentEntity = {
        ...TEST_STUDENT,
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'active',
        enrolledAt: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      }
      mockStudentService.findByStudentId.mockResolvedValue(studentEntity)

      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/students/6401001')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.studentId).toBe('6401001')
      expect(res.body.data.did).toBe('did:web:tu.ac.th:students:6401001')
    })
  })
})
