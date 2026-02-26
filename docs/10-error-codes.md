# 10 — Error Codes Reference

## โครงสร้าง Error Response

ทุก Error ที่ส่งออกจาก API ต้องเป็น format เดียวกันทั้งระบบ

```typescript
// packages/dto/src/error.types.ts

interface ErrorResponse {
  success: false
  error: {
    code: string        // Error Code (ดูตารางด้านล่าง)
    message: string     // คำอธิบายภาษาอังกฤษ
    messageTH?: string  // คำอธิบายภาษาไทย (สำหรับ Display ใน UI)
    details?: unknown   // ข้อมูลเพิ่มเติม (เช่น validation errors)
    traceId?: string    // สำหรับ Debugging
  }
  timestamp: string     // ISO 8601
}
```

### ตัวอย่าง
```json
{
  "success": false,
  "error": {
    "code": "VC_REVOKED",
    "message": "The credential has been revoked by the issuer",
    "messageTH": "หน่วยกิตนี้ถูกยกเลิกโดยผู้ออกเอกสาร",
    "traceId": "trace-550e8400-e29b"
  },
  "timestamp": "2025-01-01T10:00:00Z"
}
```

---

## Authentication & Authorization

| Code | HTTP | สาเหตุ | การแก้ไข |
|---|---|---|---|
| `AUTH_REQUIRED` | 401 | ไม่มี Authorization header | ใส่ Bearer Token |
| `AUTH_TOKEN_INVALID` | 401 | JWT format ผิด หรือ Signature ไม่ถูกต้อง | Login ใหม่ |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT หมดอายุ | ใช้ Refresh Token |
| `AUTH_REFRESH_INVALID` | 401 | Refresh Token ไม่ถูกต้องหรือหมดอายุ | Login ใหม่ |
| `AUTH_FORBIDDEN` | 403 | มี Token แต่ไม่มีสิทธิ์ทำ Action นี้ | ตรวจสอบ Role |
| `AUTH_NODE_CERT_INVALID` | 401 | mTLS Certificate ไม่ถูกต้อง | ตรวจสอบ Certificate |
| `AUTH_NODE_SUSPENDED` | 403 | Node ถูก Suspend | ติดต่อ Registry |

---

## Verifiable Credential

| Code | HTTP | สาเหตุ | การแก้ไข |
|---|---|---|---|
| `VC_NOT_FOUND` | 404 | ไม่พบ VC ID นี้ในระบบ | ตรวจสอบ VC ID |
| `VC_REVOKED` | 410 | VC ถูก Revoke แล้ว | ขอ VC ใหม่ |
| `VC_EXPIRED` | 410 | VC หมดอายุแล้ว | ขอ VC ใหม่ |
| `VC_SIGNATURE_INVALID` | 422 | Signature ของ VC ไม่ถูกต้อง | ตรวจสอบ DID + Public Key |
| `VC_ISSUER_UNKNOWN` | 422 | Issuer DID ไม่อยู่ใน Consortium | ตรวจสอบ Node ต้นทาง |
| `VC_ISSUER_SUSPENDED` | 422 | Node ที่ออก VC ถูก Suspend | ติดต่อมหาวิทยาลัยต้นทาง |
| `VC_CONTEXT_INVALID` | 422 | @context ไม่ถูกต้องตาม W3C VC 2.0 | ตรวจสอบ VC format |
| `VC_TYPE_UNSUPPORTED` | 422 | VC Type ไม่รองรับ | ใช้ Type ที่กำหนดใน docs/05-standards.md |
| `VC_ALREADY_REVOKED` | 409 | พยายาม Revoke VC ที่ถูก Revoke แล้ว | ไม่ต้องทำซ้ำ |
| `VC_STUDENT_MISMATCH` | 403 | VC ไม่ได้ออกให้นักศึกษาคนนี้ | ตรวจสอบ Student DID |
| `VC_ISSUE_FAILED` | 500 | Signing ล้มเหลว (Vault error) | ตรวจสอบ Vault connection |

---

## Verifiable Presentation

| Code | HTTP | สาเหตุ | การแก้ไข |
|---|---|---|---|
| `VP_SIGNATURE_INVALID` | 422 | Signature ของ VP ไม่ถูกต้อง | ตรวจสอบ Private Key นักศึกษา |
| `VP_CHALLENGE_MISMATCH` | 422 | Challenge ใน VP ไม่ตรงกับที่ส่งไป | ขอ Challenge ใหม่ |
| `VP_CHALLENGE_EXPIRED` | 422 | Challenge หมดอายุ (> 5 นาที) | ขอ Challenge ใหม่ |
| `VP_DOMAIN_MISMATCH` | 422 | Domain ใน VP ไม่ตรงกับ Node ปลายทาง | ตรวจสอบ Domain |
| `VP_HOLDER_MISMATCH` | 422 | Holder ใน VP ไม่ตรงกับผู้ Sign | ตรวจสอบ DID ของ Holder |
| `VP_EMPTY` | 422 | VP ไม่มี VC อยู่เลย | ใส่ VC ใน VP |
| `VP_VC_INVALID` | 422 | VC ภายใน VP ไม่ผ่านการ Verify | ดู VC Error ด้านบน |

---

## Consent

| Code | HTTP | สาเหตุ | การแก้ไข |
|---|---|---|---|
| `CONSENT_NOT_FOUND` | 404 | ไม่พบ Consent ID นี้ | ตรวจสอบ Consent ID |
| `CONSENT_REQUIRED` | 403 | ต้องได้รับ Consent ก่อนเข้าถึงข้อมูล | ขอ Consent ผ่าน Registry |
| `CONSENT_PENDING` | 403 | Consent ยังรอนักศึกษาอนุมัติ | รอนักศึกษาตอบกลับ |
| `CONSENT_DENIED` | 403 | นักศึกษาปฏิเสธ Consent | ไม่สามารถเข้าถึงข้อมูลได้ |
| `CONSENT_REVOKED` | 403 | นักศึกษา Revoke Consent แล้ว | ขอ Consent ใหม่ |
| `CONSENT_EXPIRED` | 403 | Consent หมดอายุ | ขอ Consent ใหม่ |
| `CONSENT_TOKEN_INVALID` | 401 | Token ที่ได้จาก Consent ไม่ถูกต้อง | ขอ Consent ใหม่ |
| `CONSENT_SCOPE_EXCEEDED` | 403 | ขอเข้าถึงข้อมูลมากกว่าที่ Consent อนุญาต | ขอ Consent ครอบคลุมมากขึ้น |
| `CONSENT_ALREADY_RESPONDED` | 409 | Consent ถูกตอบกลับแล้ว (approve/deny) | ไม่ต้องทำซ้ำ |

---

## Course Catalog

| Code | HTTP | สาเหตุ | การแก้ไข |
|---|---|---|---|
| `COURSE_NOT_FOUND` | 404 | ไม่พบวิชา ID นี้ในระบบ | ตรวจสอบ Course ID |
| `COURSE_INACTIVE` | 404 | วิชานี้ถูก Inactive แล้ว | ใช้วิชาอื่น |
| `COURSE_INTEGRITY_INVALID` | 422 | Course Data ถูกแก้ไขหลัง Sign | ดึงข้อมูลใหม่จาก Node |
| `COURSE_OUTCOMES_NOT_FOUND` | 404 | วิชานี้ยังไม่มี Learning Outcomes | ติดต่อมหาวิทยาลัยต้นทาง |

---

## Node Directory

| Code | HTTP | สาเหตุ | การแก้ไข |
|---|---|---|---|
| `NODE_NOT_FOUND` | 404 | ไม่พบ Node นี้ใน Consortium | ตรวจสอบ Node ID |
| `NODE_NOT_ACTIVE` | 403 | Node ถูก Suspend หรือ Revoke | ติดต่อ Consortium |
| `NODE_ALREADY_REGISTERED` | 409 | Node ID นี้ถูกลงทะเบียนแล้ว | ใช้ Node ID อื่น |
| `NODE_CERT_EXPIRED` | 401 | Certificate ของ Node หมดอายุ | ขอ Certificate ใหม่จาก Registry |

---

## Credit Transfer

| Code | HTTP | สาเหตุ | การแก้ไข |
|---|---|---|---|
| `TRANSFER_NOT_FOUND` | 404 | ไม่พบ Transfer Request | ตรวจสอบ Transfer ID |
| `TRANSFER_ALREADY_DECIDED` | 409 | Transfer ถูก Approve/Reject แล้ว | ไม่ต้องทำซ้ำ |
| `TRANSFER_SOURCE_VC_INVALID` | 422 | VC ต้นทางไม่ผ่านการ Verify | ตรวจสอบ VC |
| `TRANSFER_GRADE_BELOW_MINIMUM` | 422 | เกรดต่ำกว่าเกณฑ์ขั้นต่ำ (C+) | ไม่สามารถโอนได้ |
| `TRANSFER_CREDITS_MISMATCH` | 422 | จำนวนหน่วยกิตไม่ตรงกัน | ตรวจสอบ Course Equivalency |
| `TRANSFER_CREDIT_LIMIT_EXCEEDED` | 422 | เกินโควต้าหน่วยกิตภายนอก (30 หน่วยกิต) | ตรวจสอบหน่วยกิตสะสม |

---

## Student

| Code | HTTP | สาเหตุ | การแก้ไข |
|---|---|---|---|
| `STUDENT_NOT_FOUND` | 404 | ไม่พบนักศึกษา ID นี้ | ตรวจสอบ Student ID |
| `STUDENT_NOT_ENROLLED` | 403 | นักศึกษาไม่ได้ลงทะเบียนในมหาวิทยาลัยนี้ | ตรวจสอบมหาวิทยาลัยต้นทาง |
| `STUDENT_DID_NOT_REGISTERED` | 404 | นักศึกษายังไม่ได้ Setup UniWallet | บอกให้นักศึกษาตั้งค่า UniWallet |

---

## Validation

| Code | HTTP | สาเหตุ | การแก้ไข |
|---|---|---|---|
| `VALIDATION_ERROR` | 422 | ข้อมูล Input ไม่ถูกต้อง (Type, Format, Required) | ดู details ใน Error Response |
| `VALIDATION_GRADE_INVALID` | 422 | เกรดไม่อยู่ใน A, B+, B, C+, C, D+, D, F, S, U | ใช้เกรดที่ถูกต้อง |
| `VALIDATION_SEMESTER_INVALID` | 422 | เทอมไม่ใช่ 1, 2 หรือ S | ใช้ค่าที่ถูกต้อง |
| `VALIDATION_ACADEMIC_YEAR_INVALID` | 422 | ปีการศึกษาไม่อยู่ในรูปแบบ พ.ศ. 4 หลัก (เช่น 2567) | ใช้รูปแบบที่ถูกต้อง |
| `VALIDATION_DID_FORMAT_INVALID` | 422 | DID ไม่อยู่ในรูปแบบ did:web:... | ตรวจสอบ DID format |
| `VALIDATION_DELIVERY_MODE_INVALID` | 422 | Delivery Mode ไม่ใช่ Onsite, Online หรือ Hybrid | ใช้ค่าที่ถูกต้อง |

---

## SIS Integration

| Code | HTTP | สาเหตุ | การแก้ไข |
|---|---|---|---|
| `SIS_WEBHOOK_SECRET_INVALID` | 401 | Webhook Secret ไม่ถูกต้อง | ตรวจสอบ SIS_WEBHOOK_SECRET |
| `SIS_DATA_INCOMPLETE` | 422 | ข้อมูลจาก SIS ไม่ครบ | ตรวจสอบ SIS Payload format |
| `SIS_COURSE_NOT_SYNCED` | 404 | วิชายังไม่ถูก Sync จาก SIS | Sync Course Catalog ก่อน |

---

## External Credential

| Code | HTTP | สาเหตุ | การแก้ไข |
|---|---|---|---|
| `EXTERNAL_PLATFORM_NOT_APPROVED` | 422 | แพลตฟอร์มไม่อยู่ใน Approved List | ดู docs/06-governance.md Tier 1-3 |
| `EXTERNAL_SCORE_BELOW_MINIMUM` | 422 | คะแนนต่ำกว่าเกณฑ์ | ตรวจสอบเกณฑ์ใน Governance |
| `EXTERNAL_VC_VERIFICATION_FAILED` | 422 | VerifyVC จากแพลตฟอร์มภายนอกล้มเหลว | ตรวจสอบ VC ต้นฉบับ |
| `EXTERNAL_DOCUMENT_HASH_MISMATCH` | 422 | Hash ของ PDF ไม่ตรง (Manual Review) | อัปโหลดไฟล์ใหม่ |

---

## System / Infrastructure

| Code | HTTP | สาเหตุ | การแก้ไข |
|---|---|---|---|
| `RATE_LIMITED` | 429 | เรียก API เร็วเกินไป | รอและลองใหม่ |
| `SERVICE_UNAVAILABLE` | 503 | Service กำลัง Maintenance | รอและลองใหม่ |
| `VAULT_UNAVAILABLE` | 503 | HashiCorp Vault ไม่ตอบสนอง | ตรวจสอบ Vault |
| `REGISTRY_UNAVAILABLE` | 503 | UniRegistry ไม่ตอบสนอง | ตรวจสอบ Network |
| `DATABASE_ERROR` | 500 | DB Error (ไม่เปิดเผยรายละเอียดใน Production) | ดู Server Log |
| `INTERNAL_ERROR` | 500 | Unhandled Error | ดู Server Log + traceId |

---

## UniWallet-specific Error Codes (Client-side)

Error เหล่านี้ใช้ใน UniWallet App ไม่ได้ส่งผ่าน API

```typescript
// apps/uni-wallet/src/constants/errors.ts

export const WALLET_ERRORS = {
  // Biometric
  BIOMETRIC_NOT_AVAILABLE:     'อุปกรณ์ไม่รองรับ Biometric',
  BIOMETRIC_NOT_ENROLLED:      'ยังไม่ได้ตั้งค่า Face ID / Touch ID',
  BIOMETRIC_AUTH_FAILED:       'ยืนยันตัวตนไม่สำเร็จ',
  BIOMETRIC_LOCKED:            'Biometric ถูกล็อค — ใช้ PIN แทน',

  // PIN
  PIN_INCORRECT:               'PIN ไม่ถูกต้อง',
  PIN_ATTEMPTS_EXCEEDED:       'กรอก PIN ผิดเกิน 5 ครั้ง — กรุณา Login ใหม่',

  // Wallet
  WALLET_LOCKED:               'Wallet ถูกล็อค กรุณายืนยันตัวตน',
  WALLET_NOT_SETUP:            'ยังไม่ได้ตั้งค่า Wallet',
  PRIVATE_KEY_NOT_FOUND:       'ไม่พบ Private Key — Wallet อาจถูก Reset',

  // VP Creation
  VP_CREATE_FAILED:            'ไม่สามารถสร้าง Verifiable Presentation ได้',
  VP_SIGN_FAILED:              'ไม่สามารถ Sign VP ได้',

  // Network
  NETWORK_ERROR:               'ไม่มีการเชื่อมต่ออินเทอร์เน็ต',
  NODE_UNREACHABLE:            'ไม่สามารถเชื่อมต่อกับมหาวิทยาลัยได้',

  // Backup
  BACKUP_DECRYPT_FAILED:       'รหัสผ่าน Backup ไม่ถูกต้อง',
  BACKUP_FILE_CORRUPTED:       'ไฟล์ Backup เสียหาย',
} as const
```

---

## การ Handle Error ใน NestJS

```typescript
// packages/common/src/filters/global-exception.filter.ts

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = 500
    let code = 'INTERNAL_ERROR'
    let message = 'An unexpected error occurred'

    if (exception instanceof UniLinkException) {
      status = exception.httpStatus
      code = exception.code
      message = exception.message
    } else if (exception instanceof HttpException) {
      status = exception.getStatus()
      code = 'HTTP_ERROR'
      message = exception.message
    }

    // ไม่ Log stack trace ใน Production สำหรับ 4xx errors
    if (status >= 500) {
      this.logger.error(`[${code}] ${message}`, (exception as Error).stack)
    }

    const traceId = request.headers['x-trace-id'] ?? uuidv4()

    response.status(status).json({
      success: false,
      error: { code, message, traceId },
      timestamp: new Date().toISOString(),
    })
  }
}
```

```typescript
// packages/common/src/exceptions/unilink.exception.ts

export class UniLinkException extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400,
    public readonly details?: unknown,
  ) {
    super(message)
  }
}

// ตัวอย่างการใช้งาน
throw new UniLinkException('VC_REVOKED', 'The credential has been revoked', 410)
throw new UniLinkException('VALIDATION_ERROR', 'Invalid input', 422, validationErrors)
```
