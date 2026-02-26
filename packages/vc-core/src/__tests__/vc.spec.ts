import { createVC, type VCCreateOptions } from '../vc'

// Mock json-canonicalize
jest.mock('json-canonicalize', () => ({
  canonicalize: (data: unknown) => JSON.stringify(data),
}))

describe('createVC', () => {
  const mockSignFn = jest.fn().mockResolvedValue('mock-signature-base64url')

  const baseOptions: VCCreateOptions = {
    type: ['VerifiableCredential', 'CourseCreditCredential'],
    issuerDID: 'did:web:tu.ac.th',
    subjectDID: 'did:web:tu.ac.th:students:6501234',
    credentialSubject: {
      studentId: '6501234',
      courseId: 'CS101',
      courseName: 'Introduction to Programming',
      credits: 3,
      grade: 'A',
      gradePoint: 4.0,
      semester: '1',
      academicYear: '2567',
      deliveryMode: 'Onsite',
      institution: 'Thammasat University',
      institutionDID: 'did:web:tu.ac.th',
    },
    vcId: 'vc-tu-cs101-6501234-2567-1',
    signFn: mockSignFn,
    verificationMethod: 'did:web:tu.ac.th#key-1',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create a valid VC with correct @context', async () => {
    const vc = await createVC(baseOptions)

    expect(vc['@context']).toEqual([
      'https://www.w3.org/2018/credentials/v1',
      'https://unilink.ac.th/credentials/v1',
    ])
  })

  it('should include correct type and issuer', async () => {
    const vc = await createVC(baseOptions)

    expect(vc.type).toEqual(['VerifiableCredential', 'CourseCreditCredential'])
    expect(vc.issuer).toBe('did:web:tu.ac.th')
    expect(vc.id).toBe('vc-tu-cs101-6501234-2567-1')
  })

  it('should include credentialSubject with subject DID as id', async () => {
    const vc = await createVC(baseOptions)

    expect(vc.credentialSubject).toMatchObject({
      id: 'did:web:tu.ac.th:students:6501234',
      studentId: '6501234',
      courseId: 'CS101',
      grade: 'A',
    })
  })

  it('should have issuanceDate in ISO 8601 format', async () => {
    const vc = await createVC(baseOptions)

    expect(vc.issuanceDate).toBeDefined()
    expect(new Date(vc.issuanceDate).toISOString()).toBe(vc.issuanceDate)
  })

  it('should include Ed25519Signature2020 proof', async () => {
    const vc = await createVC(baseOptions)

    expect(vc.proof).toBeDefined()
    expect(vc.proof!.type).toBe('Ed25519Signature2020')
    expect(vc.proof!.proofPurpose).toBe('assertionMethod')
    expect(vc.proof!.verificationMethod).toBe('did:web:tu.ac.th#key-1')
    expect(vc.proof!.proofValue).toBe('mock-signature-base64url')
    expect(vc.proof!.created).toBeDefined()
  })

  it('should call signFn with canonicalized data', async () => {
    await createVC(baseOptions)

    expect(mockSignFn).toHaveBeenCalledTimes(1)
    expect(typeof mockSignFn.mock.calls[0][0]).toBe('string')
  })

  it('should include credentialStatus when statusListIndex provided', async () => {
    const vc = await createVC({
      ...baseOptions,
      statusListIndex: 42,
      statusListUrl: 'https://tu.ac.th/.well-known/status-list/1',
    })

    expect(vc.credentialStatus).toBeDefined()
    expect(vc.credentialStatus!.type).toBe('StatusList2021Entry')
    expect(vc.credentialStatus!.statusPurpose).toBe('revocation')
    expect(vc.credentialStatus!.statusListIndex).toBe('42')
    expect(vc.credentialStatus!.statusListCredential).toBe(
      'https://tu.ac.th/.well-known/status-list/1',
    )
    expect(vc.credentialStatus!.id).toBe(
      'https://tu.ac.th/.well-known/status-list/1#42',
    )
  })

  it('should NOT include credentialStatus when no statusListIndex', async () => {
    const vc = await createVC(baseOptions)

    expect(vc.credentialStatus).toBeUndefined()
  })

  it('should include expirationDate when provided', async () => {
    const expDate = '2027-12-31T23:59:59Z'
    const vc = await createVC({
      ...baseOptions,
      expirationDate: expDate,
    })

    expect(vc.expirationDate).toBe(expDate)
  })

  it('should NOT include expirationDate when not provided', async () => {
    const vc = await createVC(baseOptions)

    expect(vc.expirationDate).toBeUndefined()
  })
})
