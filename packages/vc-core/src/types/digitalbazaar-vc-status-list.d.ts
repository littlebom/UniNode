declare module '@digitalbazaar/vc-status-list' {
  export class StatusList {
    length: number
    constructor(options?: { length?: number; buffer?: Uint8Array })
    setStatus(index: number, status: boolean): void
    getStatus(index: number): boolean
    encode(): Promise<string>
    static decode(options: { encodedList: string }): Promise<StatusList>
  }

  export function createList(options: { length: number }): Promise<StatusList>

  export function decodeList(options: {
    encodedList: string
  }): Promise<StatusList>

  export function createCredential(options: {
    id: string
    list: StatusList
    statusPurpose: string
  }): Promise<{
    '@context': string[]
    id: string
    type: string[]
    credentialSubject: {
      id: string
      type: string
      encodedList: string
      statusPurpose: string
    }
  }>

  export function checkStatus(options: {
    credential: unknown
    documentLoader: (url: string) => Promise<{ document: unknown }>
    suite?: unknown
    verifyStatusListCredential?: boolean
    verifyMatchingIssuers?: boolean
  }): Promise<{ verified: boolean; error?: Error }>
}
