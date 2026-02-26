import { createAgent } from '@veramo/core'
import { DIDManager, MemoryDIDStore } from '@veramo/did-manager'
import { WebDIDProvider } from '@veramo/did-provider-web'
import { KeyManager, MemoryKeyStore, MemoryPrivateKeyStore } from '@veramo/key-manager'
import { KeyManagementSystem } from '@veramo/kms-local'
import { CredentialPlugin } from '@veramo/credential-w3c'
import { DIDResolverPlugin } from '@veramo/did-resolver'
import { Resolver } from 'did-resolver'
import { getResolver as webResolver } from 'web-did-resolver'

export type VeramoAgent = ReturnType<typeof createAgent>

export function createVeramoAgent(_options?: { privateKey?: string }): VeramoAgent {
  return createAgent({
    plugins: [
      new KeyManager({
        store: new MemoryKeyStore(),
        kms: { local: new KeyManagementSystem(new MemoryPrivateKeyStore()) },
      }),
      new DIDManager({
        store: new MemoryDIDStore(),
        defaultProvider: 'did:web',
        providers: { 'did:web': new WebDIDProvider({ defaultKms: 'local' }) },
      }),
      new DIDResolverPlugin({
        resolver: new Resolver({ ...webResolver() }),
      }),
      new CredentialPlugin(),
    ],
  })
}
