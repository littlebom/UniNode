import nodeVault from 'node-vault'

export interface VaultConfig {
  url: string
  token: string
  keyPath: string
  mountPath?: string
}

export class VaultCrypto {
  private client: ReturnType<typeof nodeVault>
  private keyPath: string
  private mountPath: string

  constructor(config: VaultConfig) {
    this.client = nodeVault({ endpoint: config.url, token: config.token })
    this.keyPath = config.keyPath
    this.mountPath = config.mountPath ?? 'transit'
  }

  async sign(data: string): Promise<string> {
    const encoded = Buffer.from(data).toString('base64')
    const response = await this.client.write(
      `${this.mountPath}/sign/${this.keyPath}`,
      { input: encoded, hash_algorithm: 'sha2-256', prehashed: false },
    )
    const signature = response.data.signature as string
    return signature.split(':')[2]
  }

  async verify(data: string, signature: string): Promise<boolean> {
    const encoded = Buffer.from(data).toString('base64')
    const vaultSig = `vault:v1:${signature}`
    const response = await this.client.write(
      `${this.mountPath}/verify/${this.keyPath}`,
      { input: encoded, signature: vaultSig, hash_algorithm: 'sha2-256' },
    )
    return response.data.valid === true
  }

  async getPublicKey(): Promise<string> {
    const response = await this.client.read(
      `${this.mountPath}/export/public-key/${this.keyPath}`,
    )
    return response.data.keys['1'] as string
  }
}
