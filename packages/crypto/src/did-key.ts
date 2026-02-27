/**
 * did:key utilities for Ed25519 public keys.
 *
 * Implements the did:key method specification:
 * https://w3c-ccg.github.io/did-method-key/
 *
 * Format: did:key:z6Mk... where 'z' = base58 multibase prefix
 * and the payload is multicodec(0xed01) + 32-byte Ed25519 public key.
 */
import { base58 } from '@scure/base'

/** Multicodec header for Ed25519 public key (varint 0xed = [0xed, 0x01]) */
const ED25519_MULTICODEC_HEADER = new Uint8Array([0xed, 0x01])

/**
 * DID Document structure (subset of W3C DID Core).
 */
export interface DIDDocument {
  '@context': string[]
  id: string
  alsoKnownAs?: string[]
  verificationMethod: Array<{
    id: string
    type: string
    controller: string
    publicKeyMultibase: string
  }>
  authentication: string[]
  assertionMethod: string[]
}

/**
 * Convert a multibase-encoded Ed25519 public key to a did:key identifier.
 *
 * @param publicKeyMultibase - Public key in 'z' + base64 format (UniLink convention)
 * @returns did:key string (e.g., "did:key:z6MkhaXgBZD...")
 *
 * @example
 * ```ts
 * const didKey = publicKeyToDidKey('z' + Buffer.from(pubKeyBytes).toString('base64'))
 * // "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
 * ```
 */
export function publicKeyToDidKey(publicKeyMultibase: string): string {
  // Decode multibase: strip 'z' prefix, decode base64 → raw 32-byte Ed25519 public key
  const rawPubKey = Buffer.from(publicKeyMultibase.slice(1), 'base64')

  if (rawPubKey.length !== 32) {
    throw new Error(
      `Invalid Ed25519 public key length: expected 32 bytes, got ${rawPubKey.length}`,
    )
  }

  // Prepend multicodec header: 0xed 0x01 (Ed25519 public key)
  const multicodecKey = new Uint8Array(
    ED25519_MULTICODEC_HEADER.length + rawPubKey.length,
  )
  multicodecKey.set(ED25519_MULTICODEC_HEADER, 0)
  multicodecKey.set(rawPubKey, ED25519_MULTICODEC_HEADER.length)

  // Encode as base58 with 'z' multibase prefix
  const encoded = base58.encode(multicodecKey)

  return `did:key:z${encoded}`
}

/**
 * Convert a did:key identifier back to a multibase-encoded public key.
 *
 * @param didKey - did:key string (e.g., "did:key:z6MkhaXgBZD...")
 * @returns Public key in 'z' + base64 format (UniLink convention)
 */
export function didKeyToPublicKey(didKey: string): string {
  if (!didKey.startsWith('did:key:z')) {
    throw new Error(`Invalid did:key format: must start with "did:key:z"`)
  }

  // Strip "did:key:z" prefix → base58-encoded bytes
  const encoded = didKey.slice('did:key:z'.length)
  const multicodecKey = base58.decode(encoded)

  // Verify multicodec header
  if (
    multicodecKey[0] !== ED25519_MULTICODEC_HEADER[0] ||
    multicodecKey[1] !== ED25519_MULTICODEC_HEADER[1]
  ) {
    throw new Error(
      `Unsupported multicodec: expected 0xed01 (Ed25519), got 0x${multicodecKey[0]?.toString(16)}${multicodecKey[1]?.toString(16)}`,
    )
  }

  // Extract raw 32-byte public key
  const rawPubKey = multicodecKey.slice(ED25519_MULTICODEC_HEADER.length)

  if (rawPubKey.length !== 32) {
    throw new Error(
      `Invalid Ed25519 public key length: expected 32 bytes, got ${rawPubKey.length}`,
    )
  }

  // Return in UniLink multibase format: 'z' + base64
  return 'z' + Buffer.from(rawPubKey).toString('base64')
}

/**
 * Resolve a did:key to a DID Document (no network required).
 *
 * The DID Document is deterministically derived from the public key
 * embedded in the did:key identifier itself.
 *
 * @param didKey - did:key string (e.g., "did:key:z6MkhaXgBZD...")
 * @returns DID Document with Ed25519VerificationKey2020
 */
export function resolveDidKey(didKey: string): DIDDocument {
  if (!didKey.startsWith('did:key:z')) {
    throw new Error(`Invalid did:key format: must start with "did:key:z"`)
  }

  // The fingerprint is the multibase-encoded part after "did:key:"
  const fingerprint = didKey.slice('did:key:'.length)
  const keyId = `${didKey}#${fingerprint}`

  // Get public key in multibase format for DID Document
  const publicKeyMultibase = didKeyToPublicKey(didKey)

  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed2020/v1',
    ],
    id: didKey,
    verificationMethod: [
      {
        id: keyId,
        type: 'Ed25519VerificationKey2020',
        controller: didKey,
        publicKeyMultibase,
      },
    ],
    authentication: [keyId],
    assertionMethod: [keyId],
  }
}
