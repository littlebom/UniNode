import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'
import { canonicalize } from './hash'

// noble/ed25519 v2 requires sha512 sync
ed.etc.sha512Sync = (...m: Uint8Array[]): Uint8Array => sha512(ed.etc.concatBytes(...m))

export interface KeyPair {
  publicKey: string   // multibase (z + base64)
  privateKey: string  // base64
}

export async function generateKeyPair(): Promise<KeyPair> {
  const privKey = ed.utils.randomPrivateKey()
  const pubKey = await ed.getPublicKeyAsync(privKey)
  return {
    privateKey: Buffer.from(privKey).toString('base64'),
    publicKey: 'z' + Buffer.from(pubKey).toString('base64'),
  }
}

export async function signData(
  data: Record<string, unknown>,
  privateKeyBase64: string,
): Promise<string> {
  const payload = canonicalize(data)
  const bytes = new TextEncoder().encode(payload)
  const privKey = Buffer.from(privateKeyBase64, 'base64')
  const sig = await ed.signAsync(bytes, privKey)
  return Buffer.from(sig).toString('base64url')
}

export async function verifySignature(
  data: Record<string, unknown>,
  signatureBase64url: string,
  publicKeyMultibase: string,
): Promise<boolean> {
  try {
    const payload = canonicalize(data)
    const bytes = new TextEncoder().encode(payload)
    const sig = Buffer.from(signatureBase64url, 'base64url')
    const pubKey = Buffer.from(publicKeyMultibase.slice(1), 'base64')
    return await ed.verifyAsync(sig, bytes, pubKey)
  } catch {
    return false
  }
}

/**
 * Verify an Ed25519 signature against raw string data (pre-canonicalized).
 *
 * Unlike `verifySignature` which canonicalizes a Record before verifying,
 * this function takes a raw string directly. Used by vc-core for verifying
 * VCs/VPs where canonicalization is handled by the caller.
 *
 * @param data - Raw string data (e.g., canonicalized VC without proof)
 * @param signatureBase64url - Base64url-encoded signature
 * @param publicKeyMultibase - Multibase-encoded public key (z + base64)
 * @returns true if signature is valid
 */
export async function verifyRaw(
  data: string,
  signatureBase64url: string,
  publicKeyMultibase: string,
): Promise<boolean> {
  try {
    const bytes = new TextEncoder().encode(data)
    const sig = Buffer.from(signatureBase64url, 'base64url')
    const pubKey = Buffer.from(publicKeyMultibase.slice(1), 'base64')
    return await ed.verifyAsync(sig, bytes, pubKey)
  } catch {
    return false
  }
}

export async function signCourseData(
  courseData: Record<string, unknown>,
  privateKeyBase64: string,
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
  publicKeyMultibase: string,
): Promise<boolean> {
  const { sha256Hex } = await import('./hash')
  const canonical = canonicalize(courseData)
  const computedHash = sha256Hex(canonical)
  if (`sha256:${computedHash}` !== hash) return false
  return verifySignature({ hash: computedHash }, signature, publicKeyMultibase)
}
