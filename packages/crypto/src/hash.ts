import { sha256 as nobleSha256 } from '@noble/hashes/sha256'
import { hmac } from '@noble/hashes/hmac'
import { canonicalize as jsonCanonicalize } from 'json-canonicalize'

export function sha256(data: string | Uint8Array): Uint8Array {
  const input = typeof data === 'string' ? new TextEncoder().encode(data) : data
  return nobleSha256(input)
}

export function sha256Hex(data: string | Uint8Array): string {
  const hash = sha256(data)
  return Buffer.from(hash).toString('hex')
}

export function canonicalize(data: unknown): string {
  return jsonCanonicalize(data)
}

export function hmacSha256(key: string | Uint8Array, data: string | Uint8Array): Uint8Array {
  const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key
  const dataBytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  return hmac(nobleSha256, keyBytes, dataBytes)
}
