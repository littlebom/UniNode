import { getStatusListCredential, isRevoked } from '../status-list'
import type { StatusListCredential, VerifiableCredential } from '@unilink/dto'

// Mock @digitalbazaar/vc-status-list (ESM package)
const mockGetStatus = jest.fn().mockReturnValue(false)

jest.mock('@digitalbazaar/vc-status-list', () => ({
  createList: jest.fn(),
  decodeList: jest.fn().mockResolvedValue({
    getStatus: mockGetStatus,
    setStatus: jest.fn(),
    encode: jest.fn(),
    length: 131072,
  }),
}))

describe('getStatusListCredential', () => {
  const mockFetchFn = jest.fn<Promise<StatusListCredential>, [string]>()

  const mockStatusListCred: StatusListCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/vc/status-list/2021/v1',
    ],
    id: 'https://tu.ac.th/.well-known/status-list/1',
    type: ['VerifiableCredential', 'StatusList2021Credential'],
    issuer: 'did:web:tu.ac.th',
    issuanceDate: '2025-01-01T00:00:00.000Z',
    credentialSubject: {
      id: 'https://tu.ac.th/.well-known/status-list/1#list',
      type: 'StatusList2021',
      statusPurpose: 'revocation',
      encodedList: 'H4sIAAAAAAAAA-encoded-list',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchFn.mockResolvedValue(mockStatusListCred)
  })

  it('should call fetchFn with the correct URL', async () => {
    const url = 'https://tu.ac.th/.well-known/status-list/1'
    await getStatusListCredential(url, mockFetchFn)

    expect(mockFetchFn).toHaveBeenCalledWith(url)
  })

  it('should return the fetched StatusListCredential', async () => {
    const result = await getStatusListCredential(
      'https://tu.ac.th/.well-known/status-list/1',
      mockFetchFn,
    )

    expect(result).toEqual(mockStatusListCred)
  })

  it('should propagate fetchFn errors', async () => {
    mockFetchFn.mockRejectedValue(new Error('Network error'))

    await expect(
      getStatusListCredential('https://tu.ac.th/.well-known/status-list/1', mockFetchFn),
    ).rejects.toThrow('Network error')
  })
})

describe('isRevoked', () => {
  const mockFetchFn = jest.fn<Promise<StatusListCredential>, [string]>()

  const mockStatusListCred: StatusListCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/vc/status-list/2021/v1',
    ],
    id: 'https://tu.ac.th/.well-known/status-list/1',
    type: ['VerifiableCredential', 'StatusList2021Credential'],
    issuer: 'did:web:tu.ac.th',
    issuanceDate: '2025-01-01T00:00:00.000Z',
    credentialSubject: {
      id: 'https://tu.ac.th/.well-known/status-list/1#list',
      type: 'StatusList2021',
      statusPurpose: 'revocation',
      encodedList: 'H4sIAAAAAAAAA-encoded-list',
    },
  }

  const vcWithStatus: VerifiableCredential = {
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
      proofValue: 'mock-signature',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchFn.mockResolvedValue(mockStatusListCred)
    mockGetStatus.mockReturnValue(false)
  })

  it('should return false when VC has no credentialStatus', async () => {
    const vcNoStatus: VerifiableCredential = {
      ...vcWithStatus,
      credentialStatus: undefined,
    }

    const result = await isRevoked(vcNoStatus, mockFetchFn)

    expect(result).toBe(false)
    expect(mockFetchFn).not.toHaveBeenCalled()
  })

  it('should return false when VC is not revoked (bit = 0)', async () => {
    mockGetStatus.mockReturnValue(false)

    const result = await isRevoked(vcWithStatus, mockFetchFn)

    expect(result).toBe(false)
    expect(mockFetchFn).toHaveBeenCalledWith(
      'https://tu.ac.th/.well-known/status-list/1',
    )
  })

  it('should return true when VC is revoked (bit = 1)', async () => {
    mockGetStatus.mockReturnValue(true)

    const result = await isRevoked(vcWithStatus, mockFetchFn)

    expect(result).toBe(true)
  })

  it('should extract correct index from credentialStatus', async () => {
    await isRevoked(vcWithStatus, mockFetchFn)

    // checkStatusAtIndex should be called with the index from credentialStatus
    expect(mockGetStatus).toHaveBeenCalledWith(42)
  })

  it('should propagate fetchFn errors', async () => {
    mockFetchFn.mockRejectedValue(new Error('Status list unavailable'))

    await expect(isRevoked(vcWithStatus, mockFetchFn)).rejects.toThrow(
      'Status list unavailable',
    )
  })
})
