import { verifyVC, type VCVerifyOptions } from '../vc'
import type { VerifiableCredential } from '@unilink/dto'

// Mock json-canonicalize
jest.mock('json-canonicalize', () => ({
  canonicalize: (data: unknown) => JSON.stringify(data),
}))

describe('verifyVC', () => {
  const mockVerifyFn = jest.fn<Promise<boolean>, [string, string, string]>()
  const mockCheckRevocationFn = jest.fn<Promise<boolean>, [VerifiableCredential]>()
  const mockResolveIssuerKeyFn = jest.fn<Promise<string>, [string, string]>()

  const validVc: VerifiableCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://unilink.ac.th/credentials/v1',
    ],
    id: 'vc-tu-cs101-6501234-2567-1',
    type: ['VerifiableCredential', 'CourseCreditCredential'],
    issuer: 'did:web:tu.ac.th',
    issuanceDate: '2025-01-01T00:00:00.000Z',
    credentialSubject: {
      id: 'did:web:tu.ac.th:students:6501234',
      studentId: '6501234',
      courseId: 'CS101',
      grade: 'A',
    },
    credentialStatus: {
      id: 'https://tu.ac.th/.well-known/status-list/1#42',
      type: 'StatusList2021Entry',
      statusPurpose: 'revocation',
      statusListIndex: '42',
      statusListCredential: 'https://tu.ac.th/.well-known/status-list/1',
    },
    proof: {
      type: 'Ed25519Signature2020',
      created: '2025-01-01T00:00:00.000Z',
      verificationMethod: 'did:web:tu.ac.th#key-1',
      proofPurpose: 'assertionMethod',
      proofValue: 'valid-signature-base64url',
    },
  }

  const baseOptions: VCVerifyOptions = {
    verifyFn: mockVerifyFn,
    issuerPublicKeyMultibase: 'zMockPublicKey123',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyFn.mockResolvedValue(true)
    mockCheckRevocationFn.mockResolvedValue(false)
    mockResolveIssuerKeyFn.mockResolvedValue('zMockPublicKey123')
  })

  it('should return isValid: true for a valid VC', async () => {
    const result = await verifyVC(validVc, baseOptions)

    expect(result.isValid).toBe(true)
    expect(result.isRevoked).toBe(false)
    expect(result.isExpired).toBe(false)
    expect(result.holder).toBe('did:web:tu.ac.th:students:6501234')
    expect(result.error).toBeUndefined()
  })

  it('should return isValid: false when proof is missing', async () => {
    const vcWithoutProof = { ...validVc, proof: undefined }

    const result = await verifyVC(vcWithoutProof, baseOptions)

    expect(result.isValid).toBe(false)
    expect(result.error).toBe('VC has no proof')
  })

  it('should return isValid: false for unsupported proof type', async () => {
    const vcBadProof: VerifiableCredential = {
      ...validVc,
      proof: { ...validVc.proof!, type: 'RsaSignature2018' as 'Ed25519Signature2020' },
    }

    const result = await verifyVC(vcBadProof, baseOptions)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Unsupported proof type')
  })

  it('should return isValid: false when signature is invalid', async () => {
    mockVerifyFn.mockResolvedValue(false)

    const result = await verifyVC(validVc, baseOptions)

    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Invalid signature')
  })

  it('should return isExpired: true when VC has expired', async () => {
    const expiredVc: VerifiableCredential = {
      ...validVc,
      expirationDate: '2024-01-01T00:00:00.000Z', // already passed
    }

    const result = await verifyVC(expiredVc, baseOptions)

    expect(result.isValid).toBe(false)
    expect(result.isExpired).toBe(true)
    expect(result.error).toBe('VC has expired')
  })

  it('should return isValid: false when issuanceDate is in the future', async () => {
    const futureVc: VerifiableCredential = {
      ...validVc,
      issuanceDate: '2099-01-01T00:00:00.000Z',
    }

    const result = await verifyVC(futureVc, baseOptions)

    expect(result.isValid).toBe(false)
    expect(result.error).toBe('VC issuanceDate is in the future')
  })

  it('should return isRevoked: true when checkRevocationFn returns true', async () => {
    mockCheckRevocationFn.mockResolvedValue(true)

    const result = await verifyVC(validVc, {
      ...baseOptions,
      checkRevocationFn: mockCheckRevocationFn,
    })

    expect(result.isValid).toBe(true) // signature is valid
    expect(result.isRevoked).toBe(true)
    expect(result.error).toBe('VC has been revoked')
  })

  it('should return isRevoked: false when no checkRevocationFn provided', async () => {
    const result = await verifyVC(validVc, baseOptions)

    expect(result.isRevoked).toBe(false)
    expect(mockCheckRevocationFn).not.toHaveBeenCalled()
  })

  it('should call resolveIssuerKeyFn when issuerPublicKeyMultibase is not provided', async () => {
    const result = await verifyVC(validVc, {
      verifyFn: mockVerifyFn,
      resolveIssuerKeyFn: mockResolveIssuerKeyFn,
    })

    expect(result.isValid).toBe(true)
    expect(mockResolveIssuerKeyFn).toHaveBeenCalledWith(
      'did:web:tu.ac.th',
      'did:web:tu.ac.th#key-1',
    )
  })

  it('should return error when resolveIssuerKeyFn fails', async () => {
    mockResolveIssuerKeyFn.mockRejectedValue(new Error('DID resolution failed'))

    const result = await verifyVC(validVc, {
      verifyFn: mockVerifyFn,
      resolveIssuerKeyFn: mockResolveIssuerKeyFn,
    })

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Failed to resolve issuer key')
  })

  it('should call verifyFn with canonicalized VC (without proof)', async () => {
    await verifyVC(validVc, baseOptions)

    expect(mockVerifyFn).toHaveBeenCalledTimes(1)
    const [data, sig, pubKey] = mockVerifyFn.mock.calls[0]

    // data should be a JSON string of VC without proof
    const parsed = JSON.parse(data)
    expect(parsed.proof).toBeUndefined()
    expect(parsed['@context']).toBeDefined()
    expect(parsed.issuer).toBe('did:web:tu.ac.th')

    expect(sig).toBe('valid-signature-base64url')
    expect(pubKey).toBe('zMockPublicKey123')
  })

  it('should return error when neither issuerPublicKeyMultibase nor resolveIssuerKeyFn provided', async () => {
    const result = await verifyVC(validVc, {
      verifyFn: mockVerifyFn,
    })

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('No issuerPublicKeyMultibase or resolveIssuerKeyFn provided')
  })
})
