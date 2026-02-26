# 01 — System Overview

## UniLink คืออะไร

UniLink คือระบบ Digital Credit Transfer Network สำหรับกลุ่มมหาวิทยาลัย (Consortium) ในประเทศไทย ช่วยให้นักศึกษาสามารถโอนหน่วยกิตระหว่างสถาบันสมาชิกได้อย่างปลอดภัย โปร่งใส และตรวจสอบได้

แรงบันดาลใจจากระบบสากล เช่น India ABC (Academic Bank of Credits) และ Europe EWP (Erasmus Without Paper) แต่ออกแบบเฉพาะสำหรับบริบทไทย โดยใช้มาตรฐาน W3C และ 1EdTech แทน Blockchain

---

## หลักการสำคัญ 5 ข้อ

### 1. Federated Architecture
- แต่ละมหาวิทยาลัยเป็น Node อิสระ มีข้อมูลของตัวเอง
- ไม่มีการรวมศูนย์ข้อมูลนักศึกษาที่ Registry
- Registry ทำหน้าที่ประสานงาน ไม่ใช่เก็บข้อมูล

### 2. Student-Centric
- นักศึกษาถือ Verifiable Credentials (VC) เองใน UniWallet
- นักศึกษาตัดสินใจว่าจะแชร์ข้อมูลกับใคร เมื่อไหร่
- มหาวิทยาลัยไม่สามารถดึงข้อมูลนักศึกษาได้โดยตรง

### 3. No Blockchain
- ใช้ W3C VC + Ed25519 Digital Signature แทน
- ได้ Trust เทียบเท่า Blockchain
- ง่ายกว่า เร็วกว่า ค่าใช้จ่ายน้อยกว่า
- ไม่ต้องการ Consensus หรือ Gas Fee

### 4. Consent-First
- ข้อมูลส่วนตัวของนักศึกษาต้องได้รับ Consent ก่อนเสมอ
- Consent มีวันหมดอายุและสามารถ Revoke ได้ทุกเวลา
- ทุก Consent ถูก log ไว้สำหรับ Audit

### 5. Standards-Based
- ใช้มาตรฐานสากลที่ established แล้ว
- ไม่ประดิษฐ์ format ขึ้นมาใหม่
- รองรับ Interoperability กับระบบสากลในอนาคต

---

## สามระบบหลัก

### UniRegistry — Central Registry
- ติดตั้งครั้งเดียวที่ Server กลาง ดูแลโดย Consortium (เช่น ทปอ. หรือ สกอ.)
- **Module A — Node Directory**: ลงทะเบียน Node, เก็บ Public Key, จัดการ mTLS Certificates
- **Module B — Aggregate Service**: รับสถิติ Aggregate จาก Node ทุกคืน (ไม่มี PII)
- **Module C — Consent Manager**: รับ-ส่ง Consent Request, แจ้งเตือนนักศึกษาผ่าน FCM
- **Module D — Audit & Monitoring**: บันทึกทุก Action, Health Check, Alert

### UniLink Node — ระบบประจำมหาวิทยาลัย
- ติดตั้งที่ Server ของแต่ละมหาวิทยาลัย ดูแลโดย IT ของมหาวิทยาลัย
- ออก Verifiable Credentials ให้นักศึกษาเมื่อผ่านวิชา
- เปิด Course Catalog API ตามมาตรฐาน 1EdTech LIS v2.0 + CASE v1.1
- จัดการ Credit Transfer Request
- ส่ง Aggregate ให้ UniRegistry ทุกคืน

### UniWallet — Digital Wallet นักศึกษา
- Mobile App (iOS + Android) และ Web App (PWA)
- เก็บ VC ของนักศึกษาอย่างปลอดภัย (Private Key อยู่ใน Secure Enclave)
- แสดงสรุปหน่วยกิต, รายวิชา, สถานะการโอน
- Share VC ให้มหาวิทยาลัยปลายทางผ่าน Verifiable Presentation (VP)
- จัดการ Consent Request — อนุญาต/ปฏิเสธ/Revoke

---

## Flow หลัก: การโอนหน่วยกิต

```
1. นักศึกษาผ่านวิชา CS101 ที่ มธ.
   └── SIS ของ มธ. บันทึกเกรด

2. UniLink Node (มธ.) รับ Event จาก SIS
   └── ออก VC (Course Credit) ส่งให้ UniWallet ของนักศึกษา

3. นักศึกษายื่นใบสมัครโอนหน่วยกิตที่ จุฬา
   └── เลือก VC ที่ต้องการส่งใน UniWallet

4. UniWallet สร้าง Verifiable Presentation (VP)
   └── Sign VP ด้วย Private Key ของนักศึกษา
   └── ส่ง VP ไปให้ UniLink Node (จุฬา)

5. UniLink Node (จุฬา) ตรวจสอบ VP
   ├── ดึง Public Key ของ มธ. จาก did.json
   ├── Verify Ed25519 Signature ของ VC
   ├── เช็ค Status List (ไม่ถูก Revoke)
   ├── ส่ง Challenge เพื่อพิสูจน์ตัวตนนักศึกษา
   └── ดึง Course Detail จาก มธ. (LIS v2.0)

6. Staff จุฬา เห็น Course Detail + LO ของ CS101
   └── เปรียบเทียบกับ CPE101 ของจุฬา
   └── เช็ค Equivalency ใน UniRegistry

7. อนุมัติ → จุฬา ออก Credit Transfer VC
   └── นักศึกษาได้รับ VC ใหม่ใน UniWallet
```

---

## Flow: การออก VC (VC Issuance)

```
1. SIS ส่ง Webhook/Event มาที่ UniLink Node
   └── หรือ Staff กรอก Manual ใน Admin Portal

2. Node ดึงข้อมูลจาก SIS
   └── courseId, grade, semester, academicYear

3. Node สร้าง VC
   └── ใส่ credentialSubject ครบตาม Schema
   └── ใส่ credentialStatus (Status List URL)

4. Node Sign VC ด้วย Ed25519 Private Key
   └── Key เก็บใน HashiCorp Vault

5. Node ส่ง VC ไปให้นักศึกษา
   └── ผ่าน FCM Push Notification
   └── UniWallet รับและเก็บ VC

6. Node ส่ง Aggregate update ไป UniRegistry
   └── ไม่มีชื่อนักศึกษา — แค่ count และ pass_rate
```

---

## การเชื่อมต่อระหว่างระบบ

```
┌──────────────┐    mTLS     ┌──────────────────┐
│ UniLink Node │◄───────────►│  UniRegistry      │
│ (มธ.)        │             │  (กลาง)           │
└──────────────┘             └──────────────────┘
       ▲                              ▲
       │ HTTPS (VP)                   │ HTTPS (Consent)
       │                              │
┌──────────────┐                ┌──────────────┐
│  UniWallet   │                │  UniWallet   │
│  (นักศึกษา) │                │  (นักศึกษา) │
└──────────────┘                └──────────────┘
       │
       │ HTTPS (VP)
       ▼
┌──────────────┐    HTTPS    ┌──────────────────┐
│ UniLink Node │◄────────────│  UniLink Node    │
│ (จุฬา)       │  did.json   │  (มธ.)            │
└──────────────┘    Course   └──────────────────┘
                    Catalog
```

---

## ข้อมูลที่ UniLink ไม่เก็บ (PDPA)

| ไม่เก็บ | เก็บอยู่ที่ |
|---|---|
| Raw grades ทั้งหมด | SIS ของมหาวิทยาลัย |
| Transcript ฉบับเต็ม | SIS ของมหาวิทยาลัย |
| GPA | คำนวณจาก SIS |
| เลขบัตรประชาชน | ไม่เก็บในระบบ |
| ที่อยู่, เบอร์โทร | ไม่เก็บในระบบ |

UniLink เก็บเฉพาะ: VC ที่ออกแล้ว, Credit Transfer History, Consent Log, Aggregate Statistics

---

## Glossary

| คำศัพท์ | ความหมาย |
|---|---|
| VC | Verifiable Credential — เอกสารดิจิทัลที่ตรวจสอบได้ |
| VP | Verifiable Presentation — ชุด VC ที่นักศึกษาส่งให้ผู้อื่น |
| DID | Decentralized Identifier — ตัวตนดิจิทัล (did:web:tu.ac.th) |
| did:web | DID method ที่ใช้ HTTPS domain แทน Blockchain |
| Ed25519 | อัลกอริทึม Digital Signature |
| mTLS | Mutual TLS — ทั้งสองฝ่าย Authenticate กัน |
| Status List | รายการ VC ที่ถูก Revoke |
| Aggregate | สถิติสรุปที่ไม่มีข้อมูลส่วนตัว (count, pass_rate) |
| LIS v2.0 | 1EdTech Learning Information Services — มาตรฐาน Course |
| CASE v1.1 | 1EdTech Competency & Academic Standards Exchange — มาตรฐาน LO |
| Consent | การยินยอมให้เข้าถึงข้อมูลของนักศึกษา |
| Node | UniLink ที่ติดตั้งที่มหาวิทยาลัย |
| Registry | UniRegistry — ระบบกลาง |
