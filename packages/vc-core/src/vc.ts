import type { VerifiableCredential, CredentialStatus, Proof } from '@unilink/dto'
import { canonicalize } from 'json-canonicalize'

export interface VCCreateOptions {
  /** VC type array, e.g. ['VerifiableCredential', 'CourseCreditCredential'] */
  type: string[]
  /** Issuer DID, e.g. 'did:web:tu.ac.th' */
  issuerDID: string
  /** Subject DID, e.g. 'did:web:tu.ac.th:students:6501234' */
  subjectDID: string
  /** Credential subject data */
  credentialSubject: Record<string, unknown>
  /** VC ID, e.g. 'vc-tu-cs101-6501234-2567-1' */
  vcId: string
  /** ISO 8601 expiration date (optional) */
  expirationDate?: string
  /** Status list index for revocation (optional) */
  statusListIndex?: number
  /** Status list credential URL (required if statusListIndex provided) */
  statusListUrl?: string
  /**
   * Signing function: receives canonicalized VC data string,
   * returns base64url-encoded signature.
   * For Vault-based signing, pass CryptoService.sign().
   * For local signing, pass ed25519 signData().
   */
  signFn: (data: string) => Promise<string>
  /** Verification method ID, e.g. 'did:web:tu.ac.th#key-1' */
  verificationMethod: string
}

export interface VCVerifyResult {
  isValid: boolean
  isRevoked: boolean
  isExpired: boolean
  holder?: string
  error?: string
}

/**
 * Create and sign a W3C Verifiable Credential 2.0.
 *
 * 1. Builds VC document structure
 * 2. Adds credentialStatus if statusListIndex is provided
 * 3. Canonicalizes VC document (JSON Canonicalization Scheme)
 * 4. Signs via signFn callback
 * 5. Attaches Ed25519Signature2020 proof
 *
 * @param options - VC creation options
 * @returns Signed VerifiableCredential
 */
export async function createVC(options: VCCreateOptions): Promise<VerifiableCredential> {
  const {
    type,
    issuerDID,
    subjectDID,
    credentialSubject,
    vcId,
    expirationDate,
    statusListIndex,
    statusListUrl,
    signFn,
    verificationMethod,
  } = options

  // 1. Build VC document (without proof)
  const vc: Omit<VerifiableCredential, 'proof'> & { proof?: Proof } = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://unilink.ac.th/credentials/v1',
    ],
    id: vcId,
    type,
    issuer: issuerDID,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: subjectDID,
      ...credentialSubject,
    },
  }

  // 2. Add expiration date if provided
  if (expirationDate) {
    vc.expirationDate = expirationDate
  }

  // 3. Add credentialStatus if statusListIndex provided
  if (statusListIndex !== undefined && statusListUrl) {
    const credentialStatus: CredentialStatus = {
      id: `${statusListUrl}#${statusListIndex}`,
      type: 'StatusList2021Entry',
      statusPurpose: 'revocation',
      statusListIndex: String(statusListIndex),
      statusListCredential: statusListUrl,
    }
    vc.credentialStatus = credentialStatus
  }

  // 4. Canonicalize VC document for signing
  const canonicalized = canonicalize(vc)

  // 5. Sign the canonicalized data
  const proofValue = await signFn(canonicalized)

  // 6. Attach proof
  const proof: Proof = {
    type: 'Ed25519Signature2020',
    created: new Date().toISOString(),
    verificationMethod,
    proofPurpose: 'assertionMethod',
    proofValue,
  }

  vc.proof = proof

  return vc as VerifiableCredential
}

export interface VCVerifyOptions {
  /**
   * Ed25519 raw string verification callback.
   * Receives canonicalized VC data, base64url signature, and multibase public key.
   */
  verifyFn: (data: string, signature: string, publicKeyMultibase: string) => Promise<boolean>
  /**
   * Optional: check if VC is revoked via Status List 2021.
   * Returns true if revoked.
   */
  checkRevocationFn?: (vc: VerifiableCredential) => Promise<boolean>
  /**
   * Shortcut: provide issuer public key directly (skip DID resolution).
   */
  issuerPublicKeyMultibase?: string
  /**
   * Resolve issuer DID → public key multibase.
   * Required if issuerPublicKeyMultibase is not provided.
   */
  resolveIssuerKeyFn?: (issuerDID: string, verificationMethod: string) => Promise<string>
}

/**
 * Verify a W3C Verifiable Credential 2.0.
 *
 * 1. Checks proof exists and type is Ed25519Signature2020
 * 2. Checks issuanceDate not in future
 * 3. Checks expirationDate not passed (if present)
 * 4. Resolves issuer public key (direct or via DID resolution)
 * 5. Strips proof → canonicalizes → verifies Ed25519 signature
 * 6. Optionally checks revocation via Status List 2021
 *
 * @param vc - The VC to verify
 * @param options - Verification callbacks and options
 * @returns Verification result
 */
export async function verifyVC(
  vc: VerifiableCredential,
  options: VCVerifyOptions,
): Promise<VCVerifyResult> {
  const result: VCVerifyResult = {
    isValid: false,
    isRevoked: false,
    isExpired: false,
    holder: typeof vc.credentialSubject === 'object' && vc.credentialSubject !== null
      ? (vc.credentialSubject as Record<string, unknown>).id as string | undefined
      : undefined,
  }

  // 1. Check proof exists
  if (!vc.proof) {
    result.error = 'VC has no proof'
    return result
  }

  // 2. Check proof type
  if (vc.proof.type !== 'Ed25519Signature2020') {
    result.error = `Unsupported proof type: ${vc.proof.type}`
    return result
  }

  // 3. Check issuanceDate not in future
  const now = new Date()
  const issuanceDate = new Date(vc.issuanceDate)
  if (issuanceDate > now) {
    result.error = 'VC issuanceDate is in the future'
    return result
  }

  // 4. Check expirationDate
  if (vc.expirationDate) {
    const expirationDate = new Date(vc.expirationDate)
    if (expirationDate <= now) {
      result.isExpired = true
      result.error = 'VC has expired'
      return result
    }
  }

  // 5. Resolve issuer public key
  let publicKeyMultibase: string
  if (options.issuerPublicKeyMultibase) {
    publicKeyMultibase = options.issuerPublicKeyMultibase
  } else if (options.resolveIssuerKeyFn) {
    try {
      publicKeyMultibase = await options.resolveIssuerKeyFn(
        vc.issuer,
        vc.proof.verificationMethod,
      )
    } catch (error) {
      result.error = `Failed to resolve issuer key: ${error instanceof Error ? error.message : 'Unknown error'}`
      return result
    }
  } else {
    result.error = 'No issuerPublicKeyMultibase or resolveIssuerKeyFn provided'
    return result
  }

  // 6. Strip proof → canonicalize → verify signature
  const { proof: _proof, ...vcWithoutProof } = vc
  const canonicalized = canonicalize(vcWithoutProof)

  try {
    const signatureValid = await options.verifyFn(
      canonicalized,
      vc.proof.proofValue,
      publicKeyMultibase,
    )
    if (!signatureValid) {
      result.error = 'Invalid signature'
      return result
    }
  } catch (error) {
    result.error = `Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    return result
  }

  // 7. Check revocation (optional)
  if (options.checkRevocationFn) {
    try {
      const revoked = await options.checkRevocationFn(vc)
      if (revoked) {
        result.isRevoked = true
        result.isValid = true // signature is valid, but VC is revoked
        result.error = 'VC has been revoked'
        return result
      }
    } catch (error) {
      result.error = `Revocation check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      return result
    }
  }

  // All checks passed
  result.isValid = true
  return result
}
