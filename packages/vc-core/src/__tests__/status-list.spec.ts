import {
  createStatusList,
  buildStatusListCredential,
  setRevoked,
  checkStatusAtIndex,
} from '../status-list'

// Mock @digitalbazaar/vc-status-list (ESM package)
const mockEncode = jest.fn().mockResolvedValue('H4sIAAAAAAAAA-encoded-list')
const mockSetStatus = jest.fn()
const mockGetStatus = jest.fn().mockReturnValue(false)

const mockList = {
  encode: mockEncode,
  setStatus: mockSetStatus,
  getStatus: mockGetStatus,
  length: 131072,
}

jest.mock('@digitalbazaar/vc-status-list', () => ({
  createList: jest.fn().mockResolvedValue({
    encode: () => Promise.resolve('H4sIAAAAAAAAA-encoded-list'),
    length: 131072,
  }),
  decodeList: jest.fn().mockResolvedValue(mockList),
}))

describe('createStatusList', () => {
  it('should create a status list with default length 131072', async () => {
    const result = await createStatusList({
      id: 'https://tu.ac.th/.well-known/status-list/1',
      issuerDID: 'did:web:tu.ac.th',
    })

    expect(result.encodedList).toBe('H4sIAAAAAAAAA-encoded-list')
    expect(result.length).toBe(131072)
  })

  it('should create a status list with custom length', async () => {
    const result = await createStatusList({
      id: 'https://tu.ac.th/.well-known/status-list/1',
      issuerDID: 'did:web:tu.ac.th',
      length: 65536,
    })

    expect(result.encodedList).toBeDefined()
    expect(result.length).toBe(65536)
  })
})

describe('buildStatusListCredential', () => {
  it('should build an unsigned StatusListCredential', () => {
    const cred = buildStatusListCredential(
      {
        id: 'https://tu.ac.th/.well-known/status-list/1',
        issuerDID: 'did:web:tu.ac.th',
      },
      'H4sIAAAAAAAAA-encoded-list',
    )

    expect(cred['@context']).toEqual([
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/vc/status-list/2021/v1',
    ])
    expect(cred.type).toEqual(['VerifiableCredential', 'StatusList2021Credential'])
    expect(cred.issuer).toBe('did:web:tu.ac.th')
    expect(cred.id).toBe('https://tu.ac.th/.well-known/status-list/1')
    expect(cred.credentialSubject.type).toBe('StatusList2021')
    expect(cred.credentialSubject.statusPurpose).toBe('revocation')
    expect(cred.credentialSubject.encodedList).toBe('H4sIAAAAAAAAA-encoded-list')
    expect(cred.issuanceDate).toBeDefined()
  })

  it('should include correct subject id with #list suffix', () => {
    const cred = buildStatusListCredential(
      {
        id: 'https://tu.ac.th/.well-known/status-list/1',
        issuerDID: 'did:web:tu.ac.th',
      },
      'encoded-list',
    )

    expect(cred.credentialSubject.id).toBe(
      'https://tu.ac.th/.well-known/status-list/1#list',
    )
  })
})

describe('setRevoked', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEncode.mockResolvedValue('H4sIAAAAAAAAA-updated-list')
  })

  it('should set a bit to revoked and return updated encoded list', async () => {
    const result = await setRevoked('H4sIAAAAAAAAA-encoded-list', 42, true)

    expect(mockSetStatus).toHaveBeenCalledWith(42, true)
    expect(result).toBe('H4sIAAAAAAAAA-updated-list')
  })

  it('should unset a bit (un-revoke) and return updated encoded list', async () => {
    const result = await setRevoked('H4sIAAAAAAAAA-encoded-list', 42, false)

    expect(mockSetStatus).toHaveBeenCalledWith(42, false)
    expect(result).toBe('H4sIAAAAAAAAA-updated-list')
  })
})

describe('checkStatusAtIndex', () => {
  it('should return false for non-revoked index', async () => {
    mockGetStatus.mockReturnValue(false)

    const result = await checkStatusAtIndex('H4sIAAAAAAAAA-encoded-list', 42)
    expect(result).toBe(false)
  })

  it('should return true for revoked index', async () => {
    mockGetStatus.mockReturnValue(true)

    const result = await checkStatusAtIndex('H4sIAAAAAAAAA-encoded-list', 42)
    expect(result).toBe(true)
  })
})
