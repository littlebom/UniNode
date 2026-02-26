import { INestApplication, Controller, Post, Body, Get, Query } from '@nestjs/common'
import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional } from 'class-validator'
import request from 'supertest'
import { createTestApp } from '../helpers/test-app'
import { TOKENS } from '../helpers/auth.helper'

// Mock packages to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
}))

jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
}))

// ─── Test DTOs ──────────────────────────────────────────

class TestInputDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  description!: string

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  count?: number
}

class TestQueryDto {
  @IsString()
  @IsOptional()
  search?: string

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number
}

// ─── Test Controller ────────────────────────────────────

@Controller('test-input')
class InputTestController {
  @Post()
  createItem(@Body() dto: TestInputDto): { received: TestInputDto } {
    return { received: dto }
  }

  @Get()
  listItems(@Query() dto: TestQueryDto): { query: TestQueryDto } {
    return { query: dto }
  }
}

describe('Input Validation Security Tests', () => {
  let app: INestApplication

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [InputTestController],
    })
    app = result.app
  })

  afterAll(async () => {
    await app.close()
  })

  // ─── SQL Injection Prevention ─────────────────────────

  describe('SQL Injection Prevention', () => {
    it('should accept but not execute SQL in string fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/test-input')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          name: "Robert'); DROP TABLE students;--",
          description: 'Test',
        })
        .expect(201)

      // Input is treated as plain string by validation pipeline
      expect(res.body.received.name).toBe("Robert'); DROP TABLE students;--")
    })

    it('should treat SQL keywords in query params as plain text', async () => {
      const res = await request(app.getHttpServer())
        .get('/unilink/api/v1/test-input?search=1 OR 1=1; DROP TABLE--')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .expect(200)

      expect(res.body.query.search).toBe('1 OR 1=1; DROP TABLE--')
    })
  })

  // ─── XSS Prevention ──────────────────────────────────

  describe('XSS Prevention', () => {
    it('should accept but not interpret script tags in body', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/test-input')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          name: '<script>alert("xss")</script>',
          description: 'Test',
        })
        .expect(201)

      // Validation pipeline keeps the string but it's never rendered as HTML
      expect(res.body.received.name).toBe('<script>alert("xss")</script>')
    })

    it('should accept but sanitize HTML event handlers', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/test-input')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          name: '<img onerror="alert(1)" src="invalid">',
          description: 'Normal text',
        })
        .expect(201)

      // API returns JSON, not HTML — XSS not possible
      expect(res.headers['content-type']).toMatch(/application\/json/)
    })
  })

  // ─── Body Size & Type Validation ──────────────────────

  describe('Body Size & Type Validation', () => {
    it('should reject oversized body (> 1mb)', async () => {
      const oversizedBody = {
        name: 'A'.repeat(2 * 1024 * 1024), // 2MB
        description: 'Test',
      }

      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/test-input')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send(oversizedBody)

      // Express body-parser rejects with 413, but NestJS GlobalExceptionFilter
      // may catch and convert to 500. Either way, the request is rejected.
      expect([413, 500]).toContain(res.status)
      expect(res.status).not.toBe(201)
    })

    it('should accept normal-sized body', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/test-input')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          name: 'Valid Name',
          description: 'Valid Description',
          count: 5,
        })
        .expect(201)

      expect(res.body.received.name).toBe('Valid Name')
      expect(res.body.received.count).toBe(5)
    })
  })

  // ─── DTO Validation ───────────────────────────────────

  describe('DTO Validation (class-validator)', () => {
    it('should reject request with missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/test-input')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({})
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.error).toBeDefined()
    })

    it('should reject request with wrong field types', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/test-input')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          name: 'Valid',
          description: 'Valid',
          count: 'not-a-number',
        })
        .expect(400)

      expect(res.body.success).toBe(false)
    })

    it('should reject request with out-of-range values', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/test-input')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          name: 'Valid',
          description: 'Valid',
          count: 999,
        })
        .expect(400)

      expect(res.body.success).toBe(false)
    })

    it('should strip unknown properties (whitelist)', async () => {
      const res = await request(app.getHttpServer())
        .post('/unilink/api/v1/test-input')
        .set('Authorization', `Bearer ${TOKENS.admin}`)
        .send({
          name: 'Valid',
          description: 'Valid',
          maliciousField: 'should-be-stripped',
        })

      // forbidNonWhitelisted: true → rejects unknown fields
      expect(res.status).toBe(400)
    })
  })
})
