import { createVP, verifyVP, type VPCreateOptions, type VPVerifyOptions } from '../vp'
import type { VerifiableCredential, VerifiablePresentation } from '@unilink/dto'
import type { VCVerifyResult } from '../vc'

// Mock json-canonicalize
jest.mock('json-canonicalize', () => ({
  canonicalize: (data: unknown) => JSON.stringify(data),
}))

describe('createVP', () => {
  const mockSignFn = jest.fn().mockResolvedValue('mock-vp-signature-base64url')

  const mockVc: VerifiableCredential = {
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
    },
    proof: {
      type: 'Ed25519Signature2020',
      created: '2025-01-01T00:00:00.000Z',
      verificationMethod: 'did:web:tu.ac.th#key-1',
      proofPurpose: 'assertionMethod',
      proofValue: 'vc-signature-base64url',
    },
  }

  const baseOptions: VPCreateOptions = {
    vcs: [mockVc],
    holderDID: 'did:web:tu.ac.th:students:6501234',
    signFn: mockSignFn,
    verificationMethod: 'did:web:tu.ac.th:students:6501234#key-1',
    challenge: 'test-challenge-uuid',
    domain: 'verifier.ac.th',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should build correct VP structure', async () => {
    const vp = await createVP(baseOptions)

    expect(vp['@context']).toEqual(['https://www.w3.org/2018/credentials/v1'])
    expect(vp.type).toEqual(['VerifiablePresentation'])
    expect(vp.holder).toBe('did:web:tu.ac.th:students:6501234')
    expect(vp.verifiableCredential).toHaveLength(1)
    expect(vp.verifiableCredential[0].id).toBe('vc-tu-cs101-6501234-2567-1')
  })

  it('should include challenge and domain in proof', async () => {
    const vp = await createVP(baseOptions)

    expect(vp.proof).toBeDefined()
    expect(vp.proof!.challenge).toBe('test-challenge-uuid')
    expect(vp.proof!.domain).toBe('verifier.ac.th')
  })

  it('should call signFn with canonicalized VP including _proofOptions', async () => {
    await createVP(baseOptions)

    expect(mockSignFn).toHaveBeenCalledTimes(1)
    const data = mockSignFn.mock.calls[0][0] as string
    const parsed = JSON.parse(data)

    // Should NOT contain proof (signed before proof is attached)
    expect(parsed.proof).toBeUndefined()
    expect(parsed.holder).toBe('did:web:tu.ac.th:students:6501234')
    expect(parsed.verifiableCredential).toBeDefined()
    // Should contain _proofOptions with challenge + domain (prevents tampering)
    expect(parsed._proofOptions).toEqual({
      challenge: 'test-challenge-uuid',
      domain: 'verifier.ac.th',
      proofPurpose: 'authentication',
    })
  })

  it('should have proofPurpose authentication', async () => {
    const vp = await createVP(baseOptions)

    expect(vp.proof!.proofPurpose).toBe('authentication')
  })

  it('should include Ed25519Signature2020 proof type', async () => {
    const vp = await createVP(baseOptions)

    expect(vp.proof!.type).toBe('Ed25519Signature2020')
    expect(vp.proof!.proofValue).toBe('mock-vp-signature-base64url')
    expect(vp.proof!.verificationMethod).toBe('did:web:tu.ac.th:students:6501234#key-1')
  })

  it('should throw when VCs array is empty', async () => {
    await expect(
      createVP({ ...baseOptions, vcs: [] }),
    ).rejects.toThrow('VP must contain at least one VC')
  })
})

describe('verifyVP', () => {
  const mockVerifyHolderFn = jest.fn<Promise<boolean>, [string, string, string]>()
  const mockVerifyVcFn = jest.fn<Promise<VCVerifyResult>, [VerifiableCredential]>()

  const validVcResult: VCVerifyResult = {
    isValid: true,
    isRevoked: false,
    isExpired: false,
    holder: 'did:web:tu.ac.th:students:6501234',
  }

  const validVp: VerifiablePresentation = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiablePresentation'],
    holder: 'did:web:tu.ac.th:students:6501234',
    verifiableCredential: [
      {
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
        },
        proof: {
          type: 'Ed25519Signature2020',
          created: '2025-01-01T00:00:00.000Z',
          verificationMethod: 'did:web:tu.ac.th#key-1',
          proofPurpose: 'assertionMethod',
          proofValue: 'vc-signature',
        },
      },
    ],
    proof: {
      type: 'Ed25519Signature2020',
      created: '2025-01-01T00:00:00.000Z',
      verificationMethod: 'did:web:tu.ac.th:students:6501234#key-1',
      proofPurpose: 'authentication',
      proofValue: 'vp-signature-base64url',
      challenge: 'test-challenge-uuid',
      domain: 'verifier.ac.th',
    },
  }

  const baseVerifyOptions: VPVerifyOptions = {
    challenge: 'test-challenge-uuid',
    domain: 'verifier.ac.th',
    verifyHolderFn: mockVerifyHolderFn,
    verifyVcFn: mockVerifyVcFn,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyHolderFn.mockResolvedValue(true)
    mockVerifyVcFn.mockResolvedValue(validVcResult)
  })

  it('should return isValid: true for a valid VP', async () => {
    const result = await verifyVP(validVp, baseVerifyOptions)

    expect(result.isValid).toBe(true)
    expect(result.holder).toBe('did:web:tu.ac.th:students:6501234')
    expect(result.credentials).toHaveLength(1)
    expect(result.credentials[0].isValid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should return isValid: false when challenge does not match', async () => {
    const result = await verifyVP(validVp, {
      ...baseVerifyOptions,
      challenge: 'wrong-challenge',
    })

    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Challenge mismatch')
  })

  it('should return isValid: false when domain does not match', async () => {
    const result = await verifyVP(validVp, {
      ...baseVerifyOptions,
      domain: 'wrong-domain.com',
    })

    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Domain mismatch')
  })

  it('should return isValid: false when holder signature is invalid', async () => {
    mockVerifyHolderFn.mockResolvedValue(false)

    const result = await verifyVP(validVp, baseVerifyOptions)

    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Invalid holder signature')
  })

  it('should return isValid: false when VC inside is invalid', async () => {
    mockVerifyVcFn.mockResolvedValue({
      isValid: false,
      isRevoked: false,
      isExpired: false,
      error: 'Invalid VC signature',
    })

    const result = await verifyVP(validVp, baseVerifyOptions)

    expect(result.isValid).toBe(false)
    expect(result.credentials[0].isValid).toBe(false)
    expect(result.error).toBe('One or more credentials failed verification')
  })

  it('should return error when VP has no credentials', async () => {
    const emptyVp: VerifiablePresentation = {
      ...validVp,
      verifiableCredential: [],
    }

    const result = await verifyVP(emptyVp, baseVerifyOptions)

    expect(result.isValid).toBe(false)
    expect(result.error).toBe('VP contains no credentials')
  })

  it('should return error when VP has no proof', async () => {
    const vpWithoutProof: VerifiablePresentation = {
      ...validVp,
      proof: undefined,
    }

    const result = await verifyVP(vpWithoutProof, baseVerifyOptions)

    expect(result.isValid).toBe(false)
    expect(result.error).toBe('VP has no proof')
  })

  it('should call verifyHolderFn with canonicalized VP including _proofOptions', async () => {
    await verifyVP(validVp, baseVerifyOptions)

    expect(mockVerifyHolderFn).toHaveBeenCalledTimes(1)
    const [data, sig, vm] = mockVerifyHolderFn.mock.calls[0]

    // data should be VP without proof but with _proofOptions
    const parsed = JSON.parse(data)
    expect(parsed.proof).toBeUndefined()
    expect(parsed.holder).toBe('did:web:tu.ac.th:students:6501234')
    expect(parsed._proofOptions).toEqual({
      challenge: 'test-challenge-uuid',
      domain: 'verifier.ac.th',
      proofPurpose: 'authentication',
    })

    expect(sig).toBe('vp-signature-base64url')
    expect(vm).toBe('did:web:tu.ac.th:students:6501234#key-1')
  })

  it('should fail when challenge is tampered in proof after signing', async () => {
    // Capture the signed data during VP creation
    const signedData: string[] = []
    const captureSignFn = async (data: string): Promise<string> => {
      signedData.push(data)
      return 'captured-signature'
    }

    const createOptions: VPCreateOptions = {
      vcs: validVp.verifiableCredential,
      holderDID: validVp.holder,
      signFn: captureSignFn,
      verificationMethod: 'did:web:tu.ac.th:students:6501234#key-1',
      challenge: 'test-challenge-uuid',
      domain: 'verifier.ac.th',
    }

    const vp = await createVP(createOptions)

    // Tamper with the challenge in the proof
    const tamperedVp: VerifiablePresentation = {
      ...vp,
      proof: { ...vp.proof!, challenge: 'tampered-challenge' },
    }

    // The verifyHolderFn should only return true if data matches what was originally signed
    mockVerifyHolderFn.mockImplementation(async (data: string): Promise<boolean> => {
      return data === signedData[0]
    })

    const result = await verifyVP(tamperedVp, {
      ...baseVerifyOptions,
      challenge: 'tampered-challenge',
    })

    // Signature check should fail because _proofOptions now has 'tampered-challenge'
    // but the original signature was over 'test-challenge-uuid'
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Invalid holder signature')
  })

  it('should fail when domain is tampered in proof after signing', async () => {
    const signedData: string[] = []
    const captureSignFn = async (data: string): Promise<string> => {
      signedData.push(data)
      return 'captured-signature'
    }

    const createOptions: VPCreateOptions = {
      vcs: validVp.verifiableCredential,
      holderDID: validVp.holder,
      signFn: captureSignFn,
      verificationMethod: 'did:web:tu.ac.th:students:6501234#key-1',
      challenge: 'test-challenge-uuid',
      domain: 'verifier.ac.th',
    }

    const vp = await createVP(createOptions)

    const tamperedVp: VerifiablePresentation = {
      ...vp,
      proof: { ...vp.proof!, domain: 'evil.com' },
    }

    mockVerifyHolderFn.mockImplementation(async (data: string): Promise<boolean> => {
      return data === signedData[0]
    })

    const result = await verifyVP(tamperedVp, {
      ...baseVerifyOptions,
      domain: 'evil.com',
    })

    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Invalid holder signature')
  })

  it('should verify all VCs in a multi-VC VP', async () => {
    const multiVp: VerifiablePresentation = {
      ...validVp,
      verifiableCredential: [
        validVp.verifiableCredential[0],
        {
          ...validVp.verifiableCredential[0],
          id: 'vc-tu-cs102-6501234-2567-1',
        },
      ],
    }

    const result = await verifyVP(multiVp, baseVerifyOptions)

    expect(result.isValid).toBe(true)
    expect(result.credentials).toHaveLength(2)
    expect(mockVerifyVcFn).toHaveBeenCalledTimes(2)
  })
})
