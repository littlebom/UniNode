import type { VeramoAgent } from './agent'

export interface DIDDocument {
  '@context': string[]
  id: string
  verificationMethod: {
    id: string
    type: string
    controller: string
    publicKeyMultibase: string
  }[]
  authentication: string[]
  assertionMethod: string[]
}

/**
 * Create a did:web DID using Veramo agent.
 * Registers the DID in Veramo's in-memory store for local resolution.
 *
 * @param agent - Veramo agent instance
 * @param domain - Domain for the did:web (e.g., 'tu.ac.th')
 * @returns The created DID string (e.g., 'did:web:tu.ac.th')
 */
export async function createDID(
  agent: VeramoAgent,
  domain: string,
): Promise<string> {
  const identifier = await (agent as unknown as {
    didManagerCreate: (args: { provider: string; alias: string }) => Promise<{ did: string }>
  }).didManagerCreate({
    provider: 'did:web',
    alias: domain,
  })

  return identifier.did
}

/**
 * Resolve a did:web DID to its DID Document.
 * Uses Veramo's DID resolver to fetch from https://<domain>/.well-known/did.json
 *
 * @param agent - Veramo agent instance
 * @param did - DID to resolve (e.g., 'did:web:tu.ac.th')
 * @returns The resolved DID Document
 */
export async function resolveDID(
  agent: VeramoAgent,
  did: string,
): Promise<DIDDocument> {
  const result = await (agent as unknown as {
    resolveDid: (args: { didUrl: string }) => Promise<{
      didDocument: DIDDocument | null
      didResolutionMetadata: { error?: string }
    }>
  }).resolveDid({ didUrl: did })

  if (result.didResolutionMetadata.error || !result.didDocument) {
    throw new Error(
      `Failed to resolve DID ${did}: ${result.didResolutionMetadata.error ?? 'Document not found'}`,
    )
  }

  return result.didDocument
}

/**
 * Convert a did:web DID to its corresponding HTTPS URL for DID Document resolution.
 *
 * @example
 * didWebToUrl('did:web:tu.ac.th') → 'https://tu.ac.th/.well-known/did.json'
 * didWebToUrl('did:web:tu.ac.th:students:6501234') → 'https://tu.ac.th/students/6501234/did.json'
 *
 * @param did - A did:web DID string
 * @returns HTTPS URL to the DID Document
 */
export function didWebToUrl(did: string): string {
  if (!did.startsWith('did:web:')) {
    throw new Error(`Invalid did:web DID: ${did}`)
  }

  const parts = did.replace('did:web:', '').split(':')
  const domain = decodeURIComponent(parts[0])
  const path = parts.slice(1).map(decodeURIComponent).join('/')

  return path
    ? `https://${domain}/${path}/did.json`
    : `https://${domain}/.well-known/did.json`
}

export function getDIDDocument(
  domain: string,
  publicKeyMultibase: string,
): DIDDocument {
  const did = `did:web:${domain}`
  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed2020/v1',
    ],
    id: did,
    verificationMethod: [
      {
        id: `${did}#key-1`,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase,
      },
    ],
    authentication: [`${did}#key-1`],
    assertionMethod: [`${did}#key-1`],
  }
}

// ─── Hybrid DID Support (did:web + did:key) ──────────────────────

/**
 * Resolve any supported DID method to a DID Document.
 *
 * - `did:key:z6Mk...` → resolved locally (no network)
 * - `did:web:...` → resolved via HTTPS
 *
 * @param did - DID string to resolve
 * @param agent - Veramo agent (required for did:web resolution)
 * @returns DID Document
 */
export async function resolveAnyDID(
  did: string,
  agent?: VeramoAgent,
): Promise<DIDDocument> {
  if (did.startsWith('did:key:')) {
    const { resolveDidKey } = await import('@unilink/crypto')
    return resolveDidKey(did) as DIDDocument
  }

  if (did.startsWith('did:web:')) {
    if (!agent) {
      // For did:web, we can build the URL and fetch directly
      const url = didWebToUrl(did)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(
          `Failed to resolve DID ${did}: HTTP ${response.status}`,
        )
      }
      return (await response.json()) as DIDDocument
    }
    return resolveDID(agent, did)
  }

  throw new Error(`Unsupported DID method: ${did}`)
}

/**
 * Build a DID Document for a student identity hosted at Registry.
 *
 * The document includes `alsoKnownAs` linking the did:web to the did:key,
 * enabling offline verification as a fallback.
 *
 * @param registryDomain - Registry domain (e.g., 'unilink.ac.th')
 * @param uuid - Student identity UUID
 * @param publicKeyMultibase - Ed25519 public key in 'z' + base64 format
 * @param didKey - The did:key identifier for this student
 * @returns DID Document with alsoKnownAs
 *
 * @example
 * ```ts
 * const doc = buildStudentDIDDocument(
 *   'unilink.ac.th',
 *   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 *   'z6MkhaXgBZDvotDk...',
 *   'did:key:z6MkhaXgBZDvotDk...',
 * )
 * // doc.id = "did:web:unilink.ac.th:id:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 * // doc.alsoKnownAs = ["did:key:z6MkhaXgBZDvotDk..."]
 * ```
 */
export function buildStudentDIDDocument(
  registryDomain: string,
  uuid: string,
  publicKeyMultibase: string,
  didKey: string,
): DIDDocument & { alsoKnownAs: string[] } {
  const did = `did:web:${registryDomain}:id:${uuid}`
  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed2020/v1',
    ],
    id: did,
    alsoKnownAs: [didKey],
    verificationMethod: [
      {
        id: `${did}#key-1`,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase,
      },
    ],
    authentication: [`${did}#key-1`],
    assertionMethod: [`${did}#key-1`],
  }
}
