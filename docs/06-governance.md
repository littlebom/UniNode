# 06 — Governance & Consortium Policies

## ภาพรวม Governance

UniLink Consortium ต้องการกรอบ Governance ที่ชัดเจนก่อนเริ่มพัฒนา เพราะการตัดสินใจในหัวข้อเหล่านี้มีผลโดยตรงต่อ Architecture และ Business Logic ของระบบ

---

## 1. Credit Standard

### 1.1 นิยามหน่วยกิต
```
1 หน่วยกิต = 15 ชั่วโมงเรียนต่อภาคเรียน
           = 1 ชั่วโมงทฤษฎีต่อสัปดาห์ (หรือ 2-3 ชั่วโมงปฏิบัติ)

หมายเหตุ: ยึดตาม มาตรฐานอุดมศึกษาไทย (สกอ.)
```

### 1.2 เกณฑ์รับโอนหน่วยกิต
```
เกรดขั้นต่ำที่รับโอน:    C+ (2.5 Grade Point) ขึ้นไป
เนื้อหาต้องตรงกัน:       ไม่น้อยกว่า 70% ของ Learning Outcomes
จำนวนหน่วยกิตต้องตรงกัน: ± 0 หน่วยกิต (ต้องเท่ากันพอดี)
วิชาที่โอนได้:            วิชาบังคับและวิชาเลือกตามที่ประกาศ
```

### 1.3 อายุของ VC
```
VC Course Credit:    7 ปี นับจากวันที่ออก
VC Credit Transfer:  7 ปี นับจากวันที่ออก
VC Degree:           ตลอดชีพ (ไม่มีวันหมดอายุ)
VC Achievement:      5 ปี หรือตามวันหมดอายุของ Certificate ต้นฉบับ
```

### 1.4 หน่วยกิตจากภายนอก
```
สูงสุดที่รับรองได้ต่อปีการศึกษา:  15 หน่วยกิต
สูงสุดตลอดหลักสูตร:               30 หน่วยกิต (25% ของ 120 หน่วยกิต)
เกรดที่ใช้:                        S/U (ไม่คำนวณ GPA)
```

---

## 2. Registry Governance

### 2.1 ผู้ดูแล UniRegistry
```
ผู้ดูแลหลัก:         ที่ประชุมอธิการบดีแห่งประเทศไทย (ทปอ.)
                      หรือ สำนักงานปลัดกระทรวงการอุดมศึกษาฯ (สป.อว.)
ผู้ดูแลเทคนิค:       ทีม IT ของ Consortium
Root of Trust:        หน่วยงานที่ดูแล UniRegistry
                      (ออก Master CA Certificate)
```

### 2.2 การเข้าร่วม Consortium
```
1. มหาวิทยาลัยยื่นใบสมัคร + เอกสารรับรองจาก สป.อว.
2. คณะกรรมการ Consortium พิจารณา (ไม่เกิน 30 วัน)
3. ลงนาม MOU กับ Consortium
4. ติดตั้ง UniLink Node + ผ่าน Acceptance Test
5. Registry ออก Node Certificate (mTLS)
6. Node ลงทะเบียนใน Registry → Status: active
```

### 2.3 การออกจาก Consortium
```
แจ้งล่วงหน้า:        180 วัน
ระหว่างรอ:           Node ยังทำงานได้ (Status: leaving)
วันสุดท้าย:          Node Status → suspended
VC ที่ออกไปแล้ว:     ยังคงใช้ได้ (ไม่ถูก Revoke อัตโนมัติ)
ข้อมูลนักศึกษา:      ต้องส่ง Export ให้ Registry เก็บไว้ 7 ปี
```

### 2.4 การ Suspend Node
```
เหตุผลที่ Suspend ได้:
- ไม่อัปเดต Node Certificate เกิน 30 วัน
- ไม่ส่ง Aggregate เกิน 90 วัน
- พบ Security Incident ที่ยังไม่แก้ไข
- ไม่ปฏิบัติตาม Consortium Policy

ผลของการ Suspend:
- ไม่สามารถออก VC ใหม่ได้
- VC เดิมยังคงใช้ได้ (ยังสามารถ Verify ได้)
- Course Catalog API ยังเปิดอยู่ (read-only)
```

---

## 3. Consent Policies

### 3.1 ระยะเวลา Consent
```
Default expiry:       30 วัน
Maximum expiry:       180 วัน
ระยะเวลาตอบสนอง:    นักศึกษาต้องตอบภายใน 14 วัน
หากไม่ตอบ:           ถือว่า "ปฏิเสธ" อัตโนมัติ
```

### 3.2 การ Revoke Consent
```
นักศึกษา Revoke ได้:   ทุกเวลา (ผ่าน UniWallet)
ผลทันที:               Token หมดอายุ (ไม่สามารถใช้ต่อได้)
ข้อมูลที่ดึงไปแล้ว:   ไม่จำเป็นต้องลบ (ขึ้นกับ Policy ของปลายทาง)
Log:                    บันทึกใน Audit Log ตลอดไป
```

### 3.3 สิทธิ์การเข้าถึงข้อมูล
```
ข้อมูลที่ต้องมี Consent:     VC ส่วนตัวของนักศึกษา
ข้อมูลที่ไม่ต้องมี Consent:  Course Catalog (ข้อมูล Academic สาธารณะ)
                               Aggregate Statistics (ไม่มี PII)
                               Node Directory

Node ที่เข้าถึงได้:          เฉพาะ Node ที่ Consent ระบุ
ระยะเวลา:                    ตามวันหมดอายุของ Consent Token
```

---

## 4. External Credential Policy

### 4.1 แพลตฟอร์มที่รับรอง (Approved Platforms)
```
Tier 1 — รับรองอัตโนมัติ (ออก VC W3C มาตรฐาน):
  - Coursera
  - edX
  - FutureLearn
  - OpenLearn (Open University)

Tier 2 — รับรองด้วย Manual Review (มี Certificate PDF):
  - Udemy (เฉพาะ Courses ที่ Consortium กำหนด)
  - LinkedIn Learning
  - Google Career Certificates
  - Microsoft Learn

Tier 3 — พิจารณาเป็นรายกรณี:
  - YouTube, Coursera Audit Mode → ไม่รับรอง
  - แพลตฟอร์มที่ไม่มีใน List → ยื่นขอพิจารณา
```

### 4.2 เกณฑ์คะแนนขั้นต่ำ
```
Tier 1: คะแนนผ่าน ≥ 70% (หรือ Complete ตามเกณฑ์แพลตฟอร์ม)
Tier 2: คะแนนผ่าน ≥ 80% + ชั่วโมงเรียน ≥ 20 ชั่วโมง
```

### 4.3 ขั้นตอน Manual Review (Tier 2)
```
1. นักศึกษาอัปโหลด Certificate PDF + URL ยืนยัน
2. Staff ตรวจสอบความถูกต้องของ Certificate (ไม่เกิน 15 วัน)
3. ตรวจสอบว่าเนื้อหาตรงกับวิชาที่ขอ Recognition
4. อนุมัติ → Node ออก Achievement VC
5. ปฏิเสธ → แจ้งเหตุผลและให้โอกาสยื่นใหม่
```

---

## 5. Privacy Policy (PDPA Compliance)

### 5.1 ข้อมูลที่ระบบเก็บ
```
UniWallet (Device ของนักศึกษา):
  - VC ทั้งหมด (Encrypted ด้วย Device Key)
  - Private Key (Secure Enclave / Android Keystore)
  - Push Notification Token (FCM)

UniLink Node:
  - รหัสนักศึกษา (ไม่มีชื่อ-นามสกุลแบบ Plain Text)
  - DID ของนักศึกษา
  - รายการ VC ที่ออก (ไม่มีเนื้อหา VC ทั้งหมด)
  - FCM Token สำหรับ Notification

UniRegistry:
  - DID ของนักศึกษา (ใน Consent Log เท่านั้น)
  - ไม่มีชื่อ ไม่มีเกรด ไม่มีข้อมูลส่วนตัว
```

### 5.2 สิทธิ์ของนักศึกษา (PDPA Rights)
```
Right to Access:      ดู VC ทั้งหมดของตัวเองได้ใน UniWallet
Right to Delete:      ลบ VC ออกจาก UniWallet ได้
                      (แต่ Node ยังเก็บ record ว่าเคยออก VC)
Right to Portability: Export VC ออกจาก UniWallet ได้ (JSON)
Right to Object:      Revoke Consent ได้ทุกเวลา
Consent:              ต้องได้รับ Explicit Consent ก่อนแชร์ข้อมูล
```

### 5.3 Data Retention
```
VC Record (Node):     7 ปี นับจากวันที่ออก
Audit Log:            10 ปี (ตาม กฎหมายราชการ)
Consent Log:          7 ปี
Aggregate Data:       ไม่มีกำหนด (ไม่ใช่ PII)
FCM Token:            ลบเมื่อนักศึกษา Deactivate Account
```

---

## 6. Security Policies

### 6.1 Key Rotation
```
Ed25519 Signing Key:    ทุก 2 ปี
mTLS Node Certificate:  ทุก 1 ปี
JWT Secret:             ทุก 90 วัน
Authentik API Key:      ทุก 180 วัน
```

### 6.2 Incident Response
```
ระดับ Critical (Private Key รั่ว):
  1. Revoke Certificate ทันที
  2. Suspend Node ชั่วคราว
  3. แจ้ง Registry ภายใน 1 ชั่วโมง
  4. ออก Key ใหม่และ Re-issue VC ที่จำเป็น
  5. Report ต่อ Consortium ภายใน 24 ชั่วโมง

ระดับ High (API Down):
  1. แจ้ง Registry ภายใน 4 ชั่วโมง
  2. ประกาศ Maintenance ใน UniWallet
  3. แก้ไขให้เสร็จภายใน 24 ชั่วโมง

ระดับ Medium (Performance Degradation):
  1. บันทึกใน Incident Log
  2. แก้ไขภายใน 72 ชั่วโมง
```

### 6.3 Security Audit
```
Internal Audit:         ทุก 6 เดือน (ทีม IT ของมหาวิทยาลัย)
Consortium Audit:       ทุก 1 ปี (ทีมกลาง)
Penetration Test:       ก่อน Production Launch + ทุก 2 ปี
Dependency Scan:        อัตโนมัติทุก PR (Snyk / Dependabot)
```

---

## 7. SLA (Service Level Agreement)

### 7.1 Uptime Requirements
```
UniRegistry:     99.9% (ไม่เกิน 8.7 ชั่วโมง downtime/ปี)
UniLink Node:    99.5% (ไม่เกิน 43.8 ชั่วโมง downtime/ปี)
UniWallet API:   99.5%
```

### 7.2 Response Time
```
GET /courses/{id}:      < 500ms (P95)
POST /vc/verify:        < 1,000ms (P95)
POST /consent/request:  < 2,000ms (P95)
```

### 7.3 Maintenance Window
```
Planned Maintenance:    อาทิตย์ 00:00-04:00 น.
แจ้งล่วงหน้า:          7 วัน
Emergency Maintenance:  แจ้งล่วงหน้า 2 ชั่วโมง
```

---

## 8. คำถามที่ต้องตอบก่อนเริ่มพัฒนา

ทีมพัฒนาต้องได้คำตอบจาก Consortium สำหรับคำถามเหล่านี้ก่อน Sprint 1:

```
☐ ใครเป็น Root CA ที่ออก Node Certificate?
☐ Consortium จะใช้ Domain อะไรสำหรับ Registry? (registry.unilink.ac.th?)
☐ มหาวิทยาลัย Pilot แรกคือที่ไหน?
☐ LDAP Schema ของมหาวิทยาลัย Pilot เป็นอย่างไร?
☐ SIS ของมหาวิทยาลัย Pilot รองรับ Webhook ไหม?
☐ ใครเป็นผู้อนุมัติ Course Equivalency?
☐ จะใช้ TSA (Timestamp Authority) ไหน?
☐ แพลตฟอร์ม Monitoring จะเปิดให้ใครเข้าถึงได้บ้าง?
```
