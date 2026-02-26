# 09 — Testing Strategy

## หลักการ Testing

UniLink ใช้ Testing Pyramid แบบ 3 ชั้น โดยเน้น Unit Test เป็นหลัก เพราะ Logic ส่วนใหญ่อยู่ใน Service Layer และ Crypto Layer

```
        /\
       /E2E\          ← น้อยที่สุด แต่ครอบคลุม Flow หลัก
      /──────\
     /Integration\    ← ทดสอบ Module ต่อ Module
    /──────────────\
   /   Unit Tests   \ ← มากที่สุด เร็วที่สุด
  /──────────────────\
```

---

## Testing Tools

| ระดับ | Tool | ใช้กับ |
|---|---|---|
| Unit | Jest + ts-jest | NestJS Services, Crypto Utils, DTO |
| Unit (Mobile) | Jest + @testing-library/react-native | Zustand Store, VP Logic |
| Integration | Jest + Supertest | NestJS API endpoints |
| E2E (API) | Playwright (API mode) | Full Flow ระหว่างระบบ |
| E2E (Mobile) | Detox | UniWallet Mobile App |
| Load Test | k6 | Performance ก่อน Production |

---

## Test Coverage Targets

| App | Unit | Integration | E2E |
|---|---|---|---|
| uni-registry | ≥ 80% | ≥ 70% | Critical paths |
| uni-node | ≥ 85% | ≥ 75% | Critical paths |
| uni-node-portal | ≥ 70% | — | Happy path |
| uni-wallet | ≥ 80% | — | Critical flows |
| packages/vc-core | ≥ 95% | — | — |
| packages/crypto | ≥ 100% | — | — |

---

## 1. Unit Tests

### packages/crypto — ต้อง 100%

```typescript
// packages/crypto/src/__tests__/ed25519.test.ts

import { generateKeyPair, signData, verifySignature } from '../ed25519'

describe('Ed25519 Crypto', () => {
  let publicKey: string
  let privateKey: string

  beforeAll(async () => {
    const keyPair = await generateKeyPair()
    publicKey = keyPair.publicKey
    privateKey = keyPair.privateKey
  })

  describe('Key Generation', () => {
    it('should generate valid Ed25519 key pair', () => {
      expect(publicKey).toBeDefined()
      expect(privateKey).toBeDefined()
      expect(publicKey.length).toBeGreaterThan(0)
    })

    it('should generate unique key pairs each time', async () => {
      const keyPair2 = await generateKeyPair()
      expect(keyPair2.publicKey).not.toBe(publicKey)
    })
  })

  describe('Sign & Verify', () => {
    it('should sign and verify data successfully', async () => {
      const data = { courseId: 'CS101', grade: 'A' }
      const signature = await signData(data, privateKey)
      const isValid = await verifySignature(data, signature, publicKey)
      expect(isValid).toBe(true)
    })

    it('should reject tampered data', async () => {
      const data = { courseId: 'CS101', grade: 'A' }
      const signature = await signData(data, privateKey)
      const tampered = { courseId: 'CS101', grade: 'F' }  // แก้เกรด
      const isValid = await verifySignature(tampered, signature, publicKey)
      expect(isValid).toBe(false)
    })

    it('should reject wrong public key', async () => {
      const data = { courseId: 'CS101', grade: 'A' }
      const signature = await signData(data, privateKey)
      const wrongKeyPair = await generateKeyPair()
      const isValid = await verifySignature(data, signature, wrongKeyPair.publicKey)
      expect(isValid).toBe(false)
    })
  })

  describe('Course Data Integrity', () => {
    it('should sign course data and verify integrity', async () => {
      const courseData = {
        courseId: 'CS101',
        courseName: 'Introduction to Programming',
        credits: 3
      }
      const { hash, signature } = await signCourseData(courseData, privateKey)
      expect(hash).toMatch(/^sha256:/)
      const isValid = await verifyCourseIntegrity(courseData, hash, signature, publicKey)
      expect(isValid).toBe(true)
    })
  })
})
```

---

### packages/vc-core — VC Logic

```typescript
// packages/vc-core/src/__tests__/vc.test.ts

import { createVC, verifyVC, createVP, verifyVP } from '../vc'

describe('Verifiable Credential', () => {
  const mockKeyPair = { /* test keys */ }

  describe('VC Creation', () => {
    it('should create valid Course Credit VC', async () => {
      const vc = await createVC({
        type: 'CourseCreditCredential',
        issuerDID: 'did:web:tu.ac.th',
        subject: {
          id: 'did:web:tu.ac.th:students:6501234',
          courseId: 'CS101',
          grade: 'A',
          credits: 3
        },
        privateKey: mockKeyPair.privateKey
      })

      expect(vc.type).toContain('CourseCreditCredential')
      expect(vc.issuer).toBe('did:web:tu.ac.th')
      expect(vc.proof).toBeDefined()
      expect(vc.proof.type).toBe('Ed25519Signature2020')
    })

    it('should include credentialStatus for revocation', async () => {
      const vc = await createVC({ /* ... */ })
      expect(vc.credentialStatus).toBeDefined()
      expect(vc.credentialStatus.type).toBe('StatusList2021Entry')
    })
  })

  describe('VC Verification', () => {
    it('should verify valid VC', async () => {
      const vc = await createVC({ /* ... */ })
      const result = await verifyVC(vc, { publicKey: mockKeyPair.publicKey })
      expect(result.isValid).toBe(true)
      expect(result.isRevoked).toBe(false)
    })

    it('should reject VC with tampered content', async () => {
      const vc = await createVC({ /* ... */ })
      vc.credentialSubject.grade = 'A+'  // แก้ไขหลัง Sign
      const result = await verifyVC(vc, { publicKey: mockKeyPair.publicKey })
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('SIGNATURE_INVALID')
    })

    it('should reject expired VC', async () => {
      const vc = await createVC({
        /* ... */
        expirationDate: '2020-01-01T00:00:00Z'  // อดีต
      })
      const result = await verifyVC(vc, { publicKey: mockKeyPair.publicKey })
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('VC_EXPIRED')
    })
  })

  describe('Verifiable Presentation', () => {
    it('should create and verify VP', async () => {
      const vc = await createVC({ /* ... */ })
      const vp = await createVP({
        vcs: [vc],
        holderDID: 'did:web:tu.ac.th:students:6501234',
        privateKey: mockKeyPair.privateKey,
        challenge: 'random-challenge-123',
        domain: 'chula.ac.th'
      })

      const result = await verifyVP(vp, {
        challenge: 'random-challenge-123',
        domain: 'chula.ac.th',
        holderPublicKey: mockKeyPair.publicKey
      })
      expect(result.isValid).toBe(true)
    })

    it('should reject VP with wrong challenge', async () => {
      const vp = await createVP({ /* challenge: 'abc' */ })
      const result = await verifyVP(vp, { challenge: 'xyz' })  // challenge ไม่ตรง
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('CHALLENGE_MISMATCH')
    })
  })
})
```

---

### uni-node — Service Tests

```typescript
// apps/uni-node/src/vc/vc.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing'
import { VCService } from './vc.service'
import { VCRepository } from './vc.repository'
import { CryptoService } from '../crypto/crypto.service'

describe('VCService', () => {
  let service: VCService
  let vcRepository: jest.Mocked<VCRepository>
  let cryptoService: jest.Mocked<CryptoService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VCService,
        {
          provide: VCRepository,
          useValue: {
            save: jest.fn(),
            findById: jest.fn(),
            findByStudentId: jest.fn(),
            updateStatus: jest.fn()
          }
        },
        {
          provide: CryptoService,
          useValue: {
            signVC: jest.fn(),
            verifySignature: jest.fn()
          }
        }
      ]
    }).compile()

    service = module.get<VCService>(VCService)
    vcRepository = module.get(VCRepository)
    cryptoService = module.get(CryptoService)
  })

  describe('issueVC', () => {
    it('should issue Course Credit VC successfully', async () => {
      const mockVC = { id: 'vc-123', /* ... */ }
      cryptoService.signVC.mockResolvedValue(mockVC as any)
      vcRepository.save.mockResolvedValue(mockVC as any)

      const result = await service.issueVC({
        studentId: '6501234',
        courseId: 'CS101',
        grade: 'A',
        semester: '1',
        academicYear: '2567'
      })

      expect(cryptoService.signVC).toHaveBeenCalledTimes(1)
      expect(vcRepository.save).toHaveBeenCalledTimes(1)
      expect(result.vcId).toBeDefined()
    })

    it('should throw if student not found', async () => {
      vcRepository.findByStudentId.mockResolvedValue(null)
      await expect(service.issueVC({ studentId: 'not-exist', /* ... */ }))
        .rejects.toThrow('STUDENT_NOT_FOUND')
    })
  })

  describe('revokeVC', () => {
    it('should revoke VC and update status list', async () => {
      vcRepository.findById.mockResolvedValue({ id: 'vc-123', status: 'active' } as any)
      vcRepository.updateStatus.mockResolvedValue(undefined)

      await service.revokeVC('vc-123', 'ข้อมูลผิดพลาด')

      expect(vcRepository.updateStatus).toHaveBeenCalledWith('vc-123', 'revoked', expect.any(String))
    })

    it('should throw if VC already revoked', async () => {
      vcRepository.findById.mockResolvedValue({ id: 'vc-123', status: 'revoked' } as any)
      await expect(service.revokeVC('vc-123', 'test'))
        .rejects.toThrow('VC_ALREADY_REVOKED')
    })
  })
})
```

---

## 2. Integration Tests

```typescript
// apps/uni-node/test/vc.integration.spec.ts

import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { createTestApp, cleanDatabase } from './helpers'

describe('VC API (Integration)', () => {
  let app: INestApplication
  let authToken: string

  beforeAll(async () => {
    app = await createTestApp()
    authToken = await getTestToken(app)
  })

  afterAll(async () => {
    await cleanDatabase()
    await app.close()
  })

  describe('POST /vc/issue', () => {
    it('should issue VC and return vcId', async () => {
      const response = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId: 'test-student-001',
          courseId: 'CS101',
          grade: 'A',
          semester: '1',
          academicYear: '2567',
          deliveryMode: 'Onsite'
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.vcId).toMatch(/^vc-/)
    })

    it('should return 422 for invalid grade', async () => {
      const response = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ studentId: '001', courseId: 'CS101', grade: 'INVALID' })

      expect(response.status).toBe(422)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /vc/verify', () => {
    it('should verify valid VP successfully', async () => {
      // 1. ออก VC ก่อน
      const issueRes = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/issue')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ /* ... */ })

      // 2. ขอ Challenge
      const challengeRes = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/challenge')
        .set('Authorization', `Bearer ${authToken}`)

      // 3. สร้าง VP และส่ง
      const vp = await createTestVP([issueRes.body.data.vc], challengeRes.body.data.challenge)
      const verifyRes = await request(app.getHttpServer())
        .post('/unilink/api/v1/vc/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ presentation: vp, challenge: challengeRes.body.data.challenge })

      expect(verifyRes.status).toBe(200)
      expect(verifyRes.body.data.isValid).toBe(true)
    })
  })

  describe('Course Catalog API', () => {
    it('GET /courses should return paginated list', async () => {
      const response = await request(app.getHttpServer())
        .get('/unilink/api/v1/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })

      expect(response.status).toBe(200)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.meta.total).toBeGreaterThanOrEqual(0)
    })

    it('GET /courses/:id/outcomes should return CASE v1.1 format', async () => {
      const response = await request(app.getHttpServer())
        .get('/unilink/api/v1/courses/CS101/outcomes')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.CFDocument).toBeDefined()
      expect(response.body.data.CFItems).toBeInstanceOf(Array)
      expect(response.body.data.CFItems[0].humanCodingScheme).toBeDefined()
    })
  })
})
```

---

## 3. E2E Tests — Full Credit Transfer Flow

```typescript
// test/e2e/credit-transfer.e2e.spec.ts
// ทดสอบ Flow เต็ม: มธ. → นักศึกษา → จุฬา

describe('E2E: Credit Transfer Flow', () => {

  it('should complete full credit transfer from TU to Chula', async () => {

    // Step 1: มธ. ออก VC ให้นักศึกษา
    const issueResponse = await tuNodeClient.post('/vc/issue', {
      studentId: 'e2e-student-001',
      courseId: 'CS101',
      grade: 'A',
      semester: '1',
      academicYear: '2567'
    })
    expect(issueResponse.status).toBe(201)
    const vcId = issueResponse.data.data.vcId

    // Step 2: ดึง VC จาก มธ. (simulate UniWallet)
    const vcResponse = await tuNodeClient.get(`/vc/${vcId}`)
    const vc = vcResponse.data.data.vc

    // Step 3: ขอ Challenge จากจุฬา
    const challengeResponse = await chulaNodeClient.post('/vc/challenge')
    const challenge = challengeResponse.data.data.challenge

    // Step 4: นักศึกษาสร้าง VP
    const vp = await createVP([vc], testStudentPrivateKey, {
      challenge,
      domain: 'chula.ac.th'
    })

    // Step 5: ส่ง VP ไปจุฬา
    const presentResponse = await chulaNodeClient.post('/vc/present', { vp })
    expect(presentResponse.status).toBe(200)
    expect(presentResponse.data.data.isValid).toBe(true)

    // Step 6: ดึง Course Detail จาก มธ. (จุฬาตรวจสอบ)
    const courseResponse = await tuNodeClient.get('/courses/CS101')
    expect(courseResponse.status).toBe(200)
    expect(courseResponse.data.data.integrity).toBeDefined()

    // Step 7: เช็ค Equivalency ใน Registry
    const equivResponse = await registryClient.get('/equivalency', {
      params: { courseId: 'CS101', fromNode: 'tu.ac.th', toNode: 'chula.ac.th' }
    })
    expect(equivResponse.data.data[0].status).toBe('approved')

    // Step 8: จุฬา Approve Transfer
    const approveResponse = await chulaNodeClient.put(
      `/transfer/${transferId}/approve`,
      { reviewNote: 'ผ่านตามเกณฑ์' }
    )
    expect(approveResponse.status).toBe(200)
    expect(approveResponse.data.data.transferVcId).toBeDefined()

  }, 30000)  // timeout 30s สำหรับ E2E

})
```

---

## 4. Load Tests (k6)

```javascript
// test/load/vc-verify.js

import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '1m',  target: 50  },   // Ramp up
    { duration: '3m',  target: 100 },   // Steady state
    { duration: '1m',  target: 0   },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // 95% ต้องเร็วกว่า 1s
    http_req_failed:   ['rate<0.01'],   // Error rate < 1%
  },
}

export default function () {
  // Load Test: GET /courses/{id}
  const courseRes = http.get(
    'https://tu.ac.th/unilink/api/v1/courses/CS101',
    { headers: { Authorization: `Bearer ${__ENV.TEST_JWT}` } }
  )
  check(courseRes, {
    'course status 200': (r) => r.status === 200,
    'course has integrity': (r) => JSON.parse(r.body).data.integrity !== undefined,
  })

  sleep(1)
}
```

---

## 5. Test Data (Fixtures)

```typescript
// test/fixtures/index.ts

export const testStudents = [
  { studentId: 'test-student-001', did: 'did:web:tu.ac.th:students:test001' },
  { studentId: 'test-student-002', did: 'did:web:tu.ac.th:students:test002' },
]

export const testCourses = [
  { courseId: 'CS101', courseName: 'Introduction to Programming', credits: 3, grade: 'A' },
  { courseId: 'MATH101', courseName: 'Calculus', credits: 3, grade: 'B+' },
  { courseId: 'ENG101', courseName: 'English Communication', credits: 3, grade: 'A' },
]

export const testNodes = [
  { nodeId: 'tu.ac.th',    name: 'มหาวิทยาลัยธรรมศาสตร์', did: 'did:web:tu.ac.th' },
  { nodeId: 'chula.ac.th', name: 'จุฬาลงกรณ์มหาวิทยาลัย',  did: 'did:web:chula.ac.th' },
]

// Test Key Pairs (ห้ามใช้ใน Production)
export const testKeyPairs = {
  'tu.ac.th': {
    publicKey:  'z6Mktest-tu-public-key...',
    privateKey: 'test-tu-private-key...',
  },
  'student-001': {
    publicKey:  'z6Mktest-student-public-key...',
    privateKey: 'test-student-private-key...',
  },
}
```

---

## 6. CI/CD Testing Pipeline

```yaml
# .github/workflows/test.yml

name: Test Pipeline

on: [push, pull_request]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm test
      - uses: codecov/codecov-action@v4

  integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:latest-pg16
        env:
          POSTGRES_PASSWORD: password
      redis:
        image: redis:7-alpine
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/test

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx audit-ci --moderate
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## 7. Critical Test Cases Checklist

```
VC Security Tests:
  ☐ VC ที่ถูก Sign ด้วย Key ผิดต้อง Invalid
  ☐ VC ที่ถูก Revoke ต้อง Invalid
  ☐ VC ที่หมดอายุต้อง Invalid
  ☐ VP ที่มี Challenge ผิดต้อง Invalid
  ☐ VP ที่มี Domain ผิดต้อง Invalid
  ☐ ข้อมูลใน VC ที่ถูกแก้ไขต้อง Invalid

Course Catalog Tests:
  ☐ Course Data ที่ถูกแก้ไขหลัง Sign ต้อง Invalid
  ☐ CASE v1.1 format ถูกต้องทุก field
  ☐ LIS v2.0 format ถูกต้องทุก field
  ☐ Pagination ทำงานถูกต้อง
  ☐ Search filter ทำงานถูกต้อง

Consent Tests:
  ☐ Token หมดอายุหลัง Revoke ทันที
  ☐ Token ที่ใช้ผิด Node ต้อง Rejected
  ☐ Consent ที่หมดอายุต้อง Rejected

API Security Tests:
  ☐ ทุก Endpoint ต้องการ JWT (ยกเว้น Public)
  ☐ Rate Limiting ทำงานถูกต้อง
  ☐ SQL Injection ต้อง Blocked
  ☐ XSS ต้อง Sanitized
  ☐ mTLS ทำงานถูกต้องระหว่าง Node กับ Registry
```
