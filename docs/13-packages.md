# 13 — Shared Packages

## ภาพรวม

packages/ ประกอบด้วย 4 library ที่ share กันระหว่าง apps ทุกตัว
ทุก package เขียนด้วย TypeScript strict mode และ build เป็น CommonJS + ESM dual package

```
packages/
├── vc-core/   ← Veramo agent + DID + VC + VP + StatusList
├── crypto/    ← Ed25519 + Hash + Vault wrapper
├── dto/       ← TypeScript types ทุกตัว
└── ui/        ← Shared UI components (shadcn base + Thai utils)
```

---

## packages/vc-core

### หน้าที่
- สร้าง Veramo agent สำหรับ DID + VC operations
- createVC / verifyVC
- createVP / verifyVP
- Status List 2021 management

### File Structure
```
packages/vc-core/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts              ← re-export ทุกอย่าง
    ├── agent.ts              ← createVeramoAgent() factory
    ├── did.ts                ← DID utilities
    ├── vc.ts                 ← createVC, verifyVC
    ├── vp.ts                 ← createVP, verifyVP
    ├── status-list.ts        ← createStatusList, setRevoked, isRevoked
    └── types.ts              ← internal types
```

### package.json
```json
{
  "name": "@unilink/vc-core",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev":   "tsup src/index.ts --format cjs,esm --dts --watch",
    "test":  "jest"
  },
  "dependencies": {
    "@veramo/core":              "^6.0.0",
    "@veramo/did-manager":       "^6.0.0",
    "@veramo/did-provider-web":  "^6.0.0",
    "@veramo/key-manager":       "^6.0.0",
    "@veramo/credential-w3c":    "^6.0.0",
    "@veramo/did-resolver":      "^6.0.0",
    "@digitalbazaar/vc-status-list": "^7.0.0",
    "did-resolver":              "^4.1.0",
    "web-did-resolver":          "^2.0.0",
    "json-canonicalize":         "^1.0.6"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "@unilink/dto": "workspace:*"
  }
}
```

### src/index.ts
```typescript
// Public exports
export { createVeramoAgent, type VeramoAgent } from './agent'
export { createDID, resolveDID, getDIDDocument } from './did'
export { createVC, verifyVC, type VCCreateOptions, type VCVerifyResult } from './vc'
export { createVP, verifyVP, type VPCreateOptions, type VPVerifyResult } from './vp'
export {
  createStatusList,
  getStatusListCredential,
  setRevoked,
  isRevoked,
} from './status-list'
```

### src/agent.ts
```typescript
import { createAgent, IAgent } from '@veramo/core'
import { DIDManager, MemoryDIDStore } from '@veramo/did-manager'
import { WebDIDProvider } from '@veramo/did-provider-web'
import { KeyManager, MemoryKeyStore, MemoryPrivateKeyStore } from '@veramo/key-manager'
import { KeyManagementSystem } from '@veramo/kms-local'
import { CredentialPlugin } from '@veramo/credential-w3c'
import { DIDResolverPlugin } from '@veramo/did-resolver'
import { Resolver } from 'did-resolver'
import { getResolver as webResolver } from 'web-did-resolver'

export type VeramoAgent = ReturnType<typeof createAgent>

export function createVeramoAgent(options?: { privateKey?: string }): VeramoAgent {
  return createAgent({
    plugins: [
      new KeyManager({
        store: new MemoryKeyStore(),
        kms: { local: new KeyManagementSystem(new MemoryPrivateKeyStore()) },
      }),
      new DIDManager({
        store: new MemoryDIDStore(),
        defaultProvider: 'did:web',
        providers: { 'did:web': new WebDIDProvider({ defaultKms: 'local' }) },
      }),
      new DIDResolverPlugin({
        resolver: new Resolver({ ...webResolver() }),
      }),
      new CredentialPlugin(),
    ],
  })
}
```

### src/vc.ts
```typescript
import type { VerifiableCredential } from '@unilink/dto'

export interface VCCreateOptions {
  type: string[]
  issuerDID: string
  subjectDID: string
  credentialSubject: Record<string, unknown>
  expirationDate?: string
  statusListIndex?: number
  statusListUrl?: string
  privateKey: string            // Base64 Ed25519 private key
}

export interface VCVerifyResult {
  isValid: boolean
  isRevoked: boolean
  isExpired: boolean
  holder?: string
  error?: string
}

export async function createVC(options: VCCreateOptions): Promise<VerifiableCredential> {
  // 1. Build VC document
  // 2. Add credentialStatus if statusListIndex provided
  // 3. Sign with Ed25519 via @noble/ed25519
  // 4. Return signed VC
  throw new Error('Not implemented — see Sprint 3-4')
}

export async function verifyVC(
  vc: VerifiableCredential,
  options: { publicKey?: string; checkRevocation?: boolean }
): Promise<VCVerifyResult> {
  // 1. Resolve issuer DID → get public key
  // 2. Verify Ed25519 signature
  // 3. Check dates
  // 4. Check status list (if checkRevocation = true)
  throw new Error('Not implemented — see Sprint 7-8')
}
```

### src/vp.ts
```typescript
export interface VPCreateOptions {
  vcs: VerifiableCredential[]
  holderDID: string
  privateKey: string            // นักศึกษา Private Key (Base64)
  challenge: string
  domain: string
}

export interface VPVerifyResult {
  isValid: boolean
  holder: string
  credentials: VCVerifyResult[]
  error?: string
}

export async function createVP(options: VPCreateOptions): Promise<VerifiablePresentation> {
  // 1. Build VP document
  // 2. Sign VP proof ด้วย holderDID Private Key
  // 3. Include challenge + domain
  throw new Error('Not implemented — see Sprint 7-8')
}

export async function verifyVP(
  vp: VerifiablePresentation,
  options: { challenge: string; domain: string; holderPublicKey?: string }
): Promise<VPVerifyResult> {
  // 1. Verify holder signature + challenge + domain
  // 2. Verify each VC inside
  throw new Error('Not implemented — see Sprint 7-8')
}
```

### src/status-list.ts
```typescript
export interface StatusListOptions {
  id: string              // URL ของ status list
  issuerDID: string
  length?: number         // default 131072
}

export async function createStatusList(options: StatusListOptions): Promise<StatusListCredential>
export async function setRevoked(listCredential: StatusListCredential, index: number, revoked: boolean): Promise<StatusListCredential>
export async function isRevoked(vc: VerifiableCredential): Promise<boolean>
export async function getStatusListCredential(url: string): Promise<StatusListCredential>
```

---

## packages/crypto

### หน้าที่
- Ed25519 key generation, sign, verify
- SHA-256 hash + JSON canonicalization
- HashiCorp Vault Transit Engine wrapper (สำหรับ Server-side signing)

### File Structure
```
packages/crypto/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── ed25519.ts        ← key gen, sign, verify (client + server)
    ├── hash.ts           ← sha256, canonicalize, hmac
    └── vault.ts          ← Vault Transit Engine wrapper
```

### package.json
```json
{
  "name": "@unilink/crypto",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": { "import": "./dist/index.mjs", "require": "./dist/index.js", "types": "./dist/index.d.ts" }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev":   "tsup src/index.ts --format cjs,esm --dts --watch",
    "test":  "jest"
  },
  "dependencies": {
    "@noble/ed25519":       "^2.1.0",
    "@noble/hashes":        "^1.4.0",
    "json-canonicalize":    "^1.0.6",
    "node-vault":           "^0.10.0"
  }
}
```

### src/index.ts
```typescript
export {
  generateKeyPair,
  signData,
  verifySignature,
  signCourseData,
  verifyCourseIntegrity,
  type KeyPair,
  type CourseIntegrity,
} from './ed25519'

export {
  sha256,
  sha256Hex,
  canonicalize,
  hmacSha256,
} from './hash'

export {
  VaultCrypto,
  type VaultConfig,
} from './vault'
```

### src/ed25519.ts
```typescript
import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'
import { canonicalize } from './hash'

// noble/ed25519 v2 ต้องการ sha512 sync
ed.etc.sha512Sync = (...m) => sha512(...m)

export interface KeyPair {
  publicKey: string   // multibase (z + base58)
  privateKey: string  // base64
}

export interface CourseIntegrity {
  hash: string        // 'sha256:abc123...'
  signature: string   // base64url
  signingKey: string  // 'did:web:tu.ac.th#key-1'
}

export async function generateKeyPair(): Promise<KeyPair> {
  const privKey = ed.utils.randomPrivateKey()
  const pubKey = await ed.getPublicKeyAsync(privKey)
  return {
    privateKey: Buffer.from(privKey).toString('base64'),
    publicKey:  'z' + Buffer.from(pubKey).toString('base64'),  // multibase z = base64
  }
}

export async function signData(
  data: Record<string, unknown>,
  privateKeyBase64: string
): Promise<string> {
  const payload = canonicalize(data)
  const bytes   = new TextEncoder().encode(payload)
  const privKey = Buffer.from(privateKeyBase64, 'base64')
  const sig     = await ed.signAsync(bytes, privKey)
  return Buffer.from(sig).toString('base64url')
}

export async function verifySignature(
  data: Record<string, unknown>,
  signatureBase64url: string,
  publicKeyMultibase: string
): Promise<boolean> {
  try {
    const payload  = canonicalize(data)
    const bytes    = new TextEncoder().encode(payload)
    const sig      = Buffer.from(signatureBase64url, 'base64url')
    const pubKey   = Buffer.from(publicKeyMultibase.slice(1), 'base64') // remove 'z' prefix
    return await ed.verifyAsync(sig, bytes, pubKey)
  } catch {
    return false
  }
}

export async function signCourseData(
  courseData: Record<string, unknown>,
  privateKeyBase64: string
): Promise<{ hash: string; signature: string }> {
  const { sha256Hex } = await import('./hash')
  const canonical = canonicalize(courseData)
  const hash = sha256Hex(canonical)
  const signature = await signData({ hash }, privateKeyBase64)
  return { hash: `sha256:${hash}`, signature }
}

export async function verifyCourseIntegrity(
  courseData: Record<string, unknown>,
  hash: string,
  signature: string,
  publicKeyMultibase: string
): Promise<boolean> {
  const { sha256Hex } = await import('./hash')
  const canonical = canonicalize(courseData)
  const computedHash = sha256Hex(canonical)
  if (`sha256:${computedHash}` !== hash) return false
  return verifySignature({ hash: computedHash }, signature, publicKeyMultibase)
}
```

### src/vault.ts
```typescript
import nodeVault from 'node-vault'

export interface VaultConfig {
  url: string
  token: string
  keyPath: string       // 'unilink/tu-ac-th/signing-key'
  mountPath?: string    // default 'transit'
}

export class VaultCrypto {
  private client: ReturnType<typeof nodeVault>
  private keyPath: string
  private mountPath: string

  constructor(config: VaultConfig) {
    this.client = nodeVault({ endpoint: config.url, token: config.token })
    this.keyPath  = config.keyPath
    this.mountPath = config.mountPath ?? 'transit'
  }

  // Sign ด้วย Vault Transit (Private Key ไม่ออกจาก Vault)
  async sign(data: string): Promise<string> {
    const encoded = Buffer.from(data).toString('base64')
    const response = await this.client.write(
      `${this.mountPath}/sign/${this.keyPath}`,
      { input: encoded, hash_algorithm: 'sha2-256', prehashed: false }
    )
    // response.data.signature format: 'vault:v1:base64sig'
    return response.data.signature.split(':')[2]
  }

  // Verify ด้วย Vault Transit
  async verify(data: string, signature: string): Promise<boolean> {
    const encoded = Buffer.from(data).toString('base64')
    const vaultSig = `vault:v1:${signature}`
    const response = await this.client.write(
      `${this.mountPath}/verify/${this.keyPath}`,
      { input: encoded, signature: vaultSig, hash_algorithm: 'sha2-256' }
    )
    return response.data.valid === true
  }

  // Export Public Key จาก Vault (ใส่ใน did.json)
  async getPublicKey(): Promise<string> {
    const response = await this.client.read(
      `${this.mountPath}/export/public-key/${this.keyPath}`
    )
    return response.data.keys['1']  // key version 1
  }
}
```

---

## packages/dto

### หน้าที่
TypeScript interfaces และ DTOs ทุกตัวที่ share กันระหว่าง apps ทั้งหมด ไม่มี runtime code — types only

### File Structure
```
packages/dto/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── vc.types.ts           ← VC, VP, Proof interfaces
    ├── course.types.ts       ← LIS v2.0 + CASE v1.1 interfaces
    ├── api.types.ts          ← Request/Response types
    ├── error.types.ts        ← ErrorResponse, UniLinkErrorCode
    └── notification.types.ts ← Push notification payloads
```

### package.json
```json
{
  "name": "@unilink/dto",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": { "import": "./dist/index.mjs", "require": "./dist/index.js", "types": "./dist/index.d.ts" }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev":   "tsup src/index.ts --format cjs,esm --dts --watch"
  }
}
```

### src/index.ts
```typescript
export * from './vc.types'
export * from './course.types'
export * from './api.types'
export * from './error.types'
export * from './notification.types'
```

---

## packages/ui

### หน้าที่
Shared UI components สำหรับ Next.js apps (uni-node-portal และ UniWallet Web)
Thai date utilities และ Grade color mapping ที่ใช้ร่วมกัน

### File Structure
```
packages/ui/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── components/           ← shadcn/ui re-exports + custom
    │   ├── badge.tsx         ← GradeBadge, StatusBadge, VCTypeBadge
    │   ├── status-indicator.tsx
    │   └── vc-card.tsx       ← VC summary card component
    └── utils/
        ├── thai-date.ts      ← แปลง ค.ศ. ↔ พ.ศ., format Thai date
        └── grade-color.ts    ← grade → Tailwind color class
```

### src/utils/thai-date.ts
```typescript
// แปลง JavaScript Date เป็น พ.ศ.
export function toThaiYear(date: Date | string): number {
  const d = new Date(date)
  return d.getFullYear() + 543
}

export function formatThaiDate(date: Date | string): string {
  const d    = new Date(date)
  const day  = d.getDate()
  const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                      'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  const month = thaiMonths[d.getMonth()]
  const year  = toThaiYear(d)
  return `${day} ${month} ${year}`
}

// '2025-01-15' → '15 ม.ค. 2568'
export function formatThaiDateFromISO(iso: string): string {
  return formatThaiDate(new Date(iso))
}
```

### src/utils/grade-color.ts
```typescript
const gradeColorMap: Record<string, string> = {
  'A':   'bg-green-100 text-green-800',
  'B+':  'bg-blue-100 text-blue-800',
  'B':   'bg-blue-100 text-blue-800',
  'C+':  'bg-yellow-100 text-yellow-800',
  'C':   'bg-yellow-100 text-yellow-800',
  'D+':  'bg-orange-100 text-orange-800',
  'D':   'bg-orange-100 text-orange-800',
  'F':   'bg-red-100 text-red-800',
  'S':   'bg-purple-100 text-purple-800',
  'U':   'bg-gray-100 text-gray-800',
}

export function gradeColor(grade: string): string {
  return gradeColorMap[grade] ?? 'bg-gray-100 text-gray-800'
}
```
