import { getDIDDocument, createDID, resolveDID, didWebToUrl, DIDDocument } from '../did'

describe('getDIDDocument', () => {
  it('should generate a valid DID document', () => {
    const doc = getDIDDocument('tu.ac.th', 'zTestPublicKey123')

    expect(doc['@context']).toContain('https://www.w3.org/ns/did/v1')
    expect(doc['@context']).toContain('https://w3id.org/security/suites/ed2020/v1')
    expect(doc.id).toBe('did:web:tu.ac.th')
    expect(doc.verificationMethod).toHaveLength(1)
    expect(doc.verificationMethod[0]).toEqual({
      id: 'did:web:tu.ac.th#key-1',
      type: 'Ed25519VerificationKey2020',
      controller: 'did:web:tu.ac.th',
      publicKeyMultibase: 'zTestPublicKey123',
    })
    expect(doc.authentication).toEqual(['did:web:tu.ac.th#key-1'])
    expect(doc.assertionMethod).toEqual(['did:web:tu.ac.th#key-1'])
  })

  it('should handle different domains', () => {
    const doc = getDIDDocument('chula.ac.th', 'zAnotherKey')

    expect(doc.id).toBe('did:web:chula.ac.th')
    expect(doc.verificationMethod[0].controller).toBe('did:web:chula.ac.th')
  })
})

describe('createDID', () => {
  it('should call didManagerCreate with correct parameters', async () => {
    const mockAgent = {
      didManagerCreate: jest.fn().mockResolvedValue({ did: 'did:web:tu.ac.th' }),
    }

    const did = await createDID(mockAgent as never, 'tu.ac.th')

    expect(did).toBe('did:web:tu.ac.th')
    expect(mockAgent.didManagerCreate).toHaveBeenCalledWith({
      provider: 'did:web',
      alias: 'tu.ac.th',
    })
  })
})

describe('resolveDID', () => {
  const mockDIDDocument: DIDDocument = {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: 'did:web:tu.ac.th',
    verificationMethod: [
      {
        id: 'did:web:tu.ac.th#key-1',
        type: 'Ed25519VerificationKey2020',
        controller: 'did:web:tu.ac.th',
        publicKeyMultibase: 'zTestKey',
      },
    ],
    authentication: ['did:web:tu.ac.th#key-1'],
    assertionMethod: ['did:web:tu.ac.th#key-1'],
  }

  it('should resolve a DID document', async () => {
    const mockAgent = {
      resolveDid: jest.fn().mockResolvedValue({
        didDocument: mockDIDDocument,
        didResolutionMetadata: {},
      }),
    }

    const doc = await resolveDID(mockAgent as never, 'did:web:tu.ac.th')

    expect(doc).toEqual(mockDIDDocument)
    expect(mockAgent.resolveDid).toHaveBeenCalledWith({
      didUrl: 'did:web:tu.ac.th',
    })
  })

  it('should throw when resolution fails', async () => {
    const mockAgent = {
      resolveDid: jest.fn().mockResolvedValue({
        didDocument: null,
        didResolutionMetadata: { error: 'notFound' },
      }),
    }

    await expect(
      resolveDID(mockAgent as never, 'did:web:nonexistent.ac.th'),
    ).rejects.toThrow('Failed to resolve DID did:web:nonexistent.ac.th')
  })

  it('should throw when document is null', async () => {
    const mockAgent = {
      resolveDid: jest.fn().mockResolvedValue({
        didDocument: null,
        didResolutionMetadata: {},
      }),
    }

    await expect(
      resolveDID(mockAgent as never, 'did:web:empty.ac.th'),
    ).rejects.toThrow('Document not found')
  })
})

describe('didWebToUrl', () => {
  it('should convert root domain to .well-known path', () => {
    expect(didWebToUrl('did:web:tu.ac.th')).toBe(
      'https://tu.ac.th/.well-known/did.json',
    )
  })

  it('should convert domain with path to path-based URL', () => {
    expect(didWebToUrl('did:web:tu.ac.th:students:6501234')).toBe(
      'https://tu.ac.th/students/6501234/did.json',
    )
  })

  it('should handle URL-encoded domains', () => {
    expect(didWebToUrl('did:web:example.com%3A3000')).toBe(
      'https://example.com:3000/.well-known/did.json',
    )
  })

  it('should throw for non did:web DIDs', () => {
    expect(() => didWebToUrl('did:key:z123abc')).toThrow('Invalid did:web DID')
  })

  it('should handle single path segment', () => {
    expect(didWebToUrl('did:web:tu.ac.th:nodes')).toBe(
      'https://tu.ac.th/nodes/did.json',
    )
  })
})
