import type { StatusListCredential, VerifiableCredential } from '@unilink/dto'

export interface StatusListOptions {
  /** Status list credential ID/URL, e.g. 'https://tu.ac.th/.well-known/status-list/1' */
  id: string
  /** Issuer DID, e.g. 'did:web:tu.ac.th' */
  issuerDID: string
  /** Number of entries in the status list (default: 131072) */
  length?: number
}

export interface StatusListCreateResult {
  /** Compressed/encoded bitstring */
  encodedList: string
  /** Total number of entries */
  length: number
}

/**
 * Create a new empty status list (all bits = 0 = not revoked).
 *
 * Uses @digitalbazaar/vc-status-list internally.
 * Returns the encoded bitstring which should be stored in DB.
 *
 * @param options - Status list creation options
 * @returns Encoded bitstring and length
 */
export async function createStatusList(
  options: StatusListOptions,
): Promise<StatusListCreateResult> {
  const length = options.length ?? 131072
  // Dynamic import for ESM compatibility
  const { createList } = await import('@digitalbazaar/vc-status-list')
  const list = await createList({ length })
  const encodedList = await list.encode()
  return { encodedList, length }
}

/**
 * Build an unsigned StatusListCredential from an encoded list.
 * The proof should be added separately by the signing layer.
 *
 * @param options - Status list options (id, issuerDID)
 * @param encodedList - The compressed bitstring
 * @returns Unsigned StatusListCredential
 */
export function buildStatusListCredential(
  options: StatusListOptions,
  encodedList: string,
): StatusListCredential {
  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/vc/status-list/2021/v1',
    ],
    id: options.id,
    type: ['VerifiableCredential', 'StatusList2021Credential'],
    issuer: options.issuerDID,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: `${options.id}#list`,
      type: 'StatusList2021',
      statusPurpose: 'revocation',
      encodedList,
    },
  }
}

/**
 * Set or unset the revocation bit at a given index.
 *
 * @param encodedList - Current compressed bitstring
 * @param index - Bit position to update
 * @param revoked - true = revoked, false = not revoked
 * @returns Updated compressed bitstring
 */
export async function setRevoked(
  encodedList: string,
  index: number,
  revoked: boolean,
): Promise<string> {
  const { decodeList } = await import('@digitalbazaar/vc-status-list')
  const list = await decodeList({ encodedList })
  list.setStatus(index, revoked)
  return list.encode()
}

/**
 * Check if a specific index in the status list is revoked.
 *
 * @param encodedList - Compressed bitstring
 * @param index - Bit position to check
 * @returns true if revoked
 */
export async function checkStatusAtIndex(
  encodedList: string,
  index: number,
): Promise<boolean> {
  const { decodeList } = await import('@digitalbazaar/vc-status-list')
  const list = await decodeList({ encodedList })
  return list.getStatus(index)
}

/**
 * Fetch a StatusListCredential from a URL.
 *
 * Uses a caller-provided fetchFn to keep vc-core framework-agnostic
 * (no dependency on node-fetch, axios, or HttpService).
 *
 * @param url - URL to the StatusListCredential
 * @param fetchFn - Callback to fetch the credential (e.g., native fetch wrapper)
 * @returns The fetched StatusListCredential
 */
export async function getStatusListCredential(
  url: string,
  fetchFn: (url: string) => Promise<StatusListCredential>,
): Promise<StatusListCredential> {
  return fetchFn(url)
}

/**
 * Check if a VC is revoked by fetching its Status List 2021 credential
 * and checking the bit at the VC's statusListIndex.
 *
 * @param vc - The VC to check for revocation
 * @param fetchFn - Callback to fetch the status list credential
 * @returns true if the VC is revoked, false otherwise
 */
export async function isRevoked(
  vc: VerifiableCredential,
  fetchFn: (url: string) => Promise<StatusListCredential>,
): Promise<boolean> {
  // If VC has no credentialStatus, it's not revocable
  if (!vc.credentialStatus) {
    return false
  }

  const { statusListCredential: statusListUrl, statusListIndex } = vc.credentialStatus
  const index = parseInt(statusListIndex, 10)

  // Fetch the status list credential
  const statusListCred = await getStatusListCredential(statusListUrl, fetchFn)

  // Check the bit at the given index
  return checkStatusAtIndex(statusListCred.credentialSubject.encodedList, index)
}
