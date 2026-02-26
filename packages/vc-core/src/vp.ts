import type { VerifiableCredential, VerifiablePresentation, Proof } from '@unilink/dto'
import { canonicalize } from 'json-canonicalize'
import type { VCVerifyResult } from './vc'

export interface VPCreateOptions {
  /** VCs to include in the presentation */
  vcs: VerifiableCredential[]
  /** Holder DID, e.g. 'did:web:tu.ac.th:students:6501234' */
  holderDID: string
  /**
   * Signing function: receives canonicalized VP data string,
   * returns base64url-encoded signature.
   * For local signing, pass ed25519 signRaw() wrapper.
   */
  signFn: (data: string) => Promise<string>
  /** Verification method ID, e.g. 'did:web:tu.ac.th:students:6501234#key-1' */
  verificationMethod: string
  /** Challenge from the verifier */
  challenge: string
  /** Verifier's domain */
  domain: string
}

export interface VPVerifyOptions {
  /** Expected challenge value */
  challenge: string
  /** Expected domain value */
  domain: string
  /**
   * Verify holder's VP signature.
   * Receives canonicalized VP data, base64url signature, and the verificationMethod string.
   * The implementation should resolve the DID → get public key → verify.
   */
  verifyHolderFn: (data: string, signature: string, verificationMethod: string) => Promise<boolean>
  /**
   * Verify each embedded VC.
   * Called for each VC in the VP's verifiableCredential array.
   */
  verifyVcFn: (vc: VerifiableCredential) => Promise<VCVerifyResult>
}

export interface VPVerifyResult {
  isValid: boolean
  holder: string
  credentials: VCVerifyResult[]
  error?: string
}

/**
 * Create and sign a W3C Verifiable Presentation.
 *
 * 1. Validates VCs array is not empty
 * 2. Builds VP document structure (without proof)
 * 3. Appends _proofOptions (challenge, domain, proofPurpose) to prevent tampering
 * 4. Canonicalizes VP + _proofOptions (JSON Canonicalization Scheme)
 * 5. Signs via signFn callback
 * 6. Attaches Ed25519Signature2020 proof with challenge + domain
 *
 * @param options - VP creation options
 * @returns Signed VerifiablePresentation
 */
export async function createVP(options: VPCreateOptions): Promise<VerifiablePresentation> {
  const { vcs, holderDID, signFn, verificationMethod, challenge, domain } = options

  if (vcs.length === 0) {
    throw new Error('VP must contain at least one VC')
  }

  // 1. Build VP document (without proof)
  const vp: Omit<VerifiablePresentation, 'proof'> & { proof?: Proof & { challenge: string; domain: string } } = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiablePresentation'],
    holder: holderDID,
    verifiableCredential: vcs,
  }

  // 2. Build proof options to include in signed data (prevents challenge/domain tampering)
  const proofOptions = {
    challenge,
    domain,
    proofPurpose: 'authentication' as const,
  }

  // 3. Canonicalize VP document + proof options for signing
  const canonicalized = canonicalize({ ...vp, _proofOptions: proofOptions })

  // 4. Sign the canonicalized data
  const proofValue = await signFn(canonicalized)

  // 5. Attach proof with challenge + domain
  vp.proof = {
    type: 'Ed25519Signature2020',
    created: new Date().toISOString(),
    verificationMethod,
    proofPurpose: 'authentication',
    proofValue,
    challenge,
    domain,
  }

  return vp as VerifiablePresentation
}

/**
 * Verify a W3C Verifiable Presentation.
 *
 * 1. Checks VP has proof and type is Ed25519Signature2020
 * 2. Validates challenge matches expected value
 * 3. Validates domain matches expected value
 * 4. Strips proof → reconstructs _proofOptions → canonicalizes → verifies holder signature
 * 5. Verifies each embedded VC via verifyVcFn callback
 *
 * @param vp - The VP to verify
 * @param options - Verification callbacks and expected challenge/domain
 * @returns Verification result with per-VC details
 */
export async function verifyVP(
  vp: VerifiablePresentation,
  options: VPVerifyOptions,
): Promise<VPVerifyResult> {
  const result: VPVerifyResult = {
    isValid: false,
    holder: vp.holder,
    credentials: [],
  }

  // 1. Check VP has VCs
  if (!vp.verifiableCredential || vp.verifiableCredential.length === 0) {
    result.error = 'VP contains no credentials'
    return result
  }

  // 2. Check proof exists
  if (!vp.proof) {
    result.error = 'VP has no proof'
    return result
  }

  // 3. Check proof type
  if (vp.proof.type !== 'Ed25519Signature2020') {
    result.error = `Unsupported proof type: ${vp.proof.type}`
    return result
  }

  // 4. Check challenge
  if (vp.proof.challenge !== options.challenge) {
    result.error = 'Challenge mismatch'
    return result
  }

  // 5. Check domain
  if (vp.proof.domain !== options.domain) {
    result.error = 'Domain mismatch'
    return result
  }

  // 6. Strip proof → reconstruct proof options → canonicalize → verify holder signature
  const { proof: _proof, ...vpWithoutProof } = vp
  const proofOptions = {
    challenge: options.challenge,
    domain: options.domain,
    proofPurpose: 'authentication' as const,
  }
  const canonicalized = canonicalize({ ...vpWithoutProof, _proofOptions: proofOptions })

  try {
    const signatureValid = await options.verifyHolderFn(
      canonicalized,
      vp.proof.proofValue,
      vp.proof.verificationMethod,
    )
    if (!signatureValid) {
      result.error = 'Invalid holder signature'
      return result
    }
  } catch (error) {
    result.error = `Holder signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    return result
  }

  // 7. Verify each embedded VC
  let allVcsValid = true
  for (const vc of vp.verifiableCredential) {
    const vcResult = await options.verifyVcFn(vc)
    result.credentials.push(vcResult)
    if (!vcResult.isValid) {
      allVcsValid = false
    }
  }

  result.isValid = allVcsValid
  if (!allVcsValid) {
    result.error = 'One or more credentials failed verification'
  }

  return result
}
