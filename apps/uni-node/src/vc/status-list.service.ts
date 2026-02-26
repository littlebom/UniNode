import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { StatusListRepository } from './status-list.repository'
import { StatusListEntity } from './status-list.entity'
import {
  createStatusList,
  buildStatusListCredential,
  setRevoked,
} from '@unilink/vc-core'
import type { StatusListCredential } from '@unilink/dto'

const DEFAULT_LIST_ID = '1'
const DEFAULT_LIST_LENGTH = 131072

@Injectable()
export class StatusListService {
  private readonly logger = new Logger(StatusListService.name)

  constructor(
    private readonly statusListRepo: StatusListRepository,
    private readonly config: ConfigService,
  ) {}

  /**
   * Get or create the default status list.
   * Creates a new empty status list if none exists.
   */
  async getOrCreateStatusList(listId?: string): Promise<StatusListEntity> {
    const id = listId ?? DEFAULT_LIST_ID
    const existing = await this.statusListRepo.findByListId(id)
    if (existing) {
      return existing
    }

    // Create a new status list
    const domain = this.config.get<string>('NODE_DOMAIN', 'localhost')
    const issuerDid = `did:web:${domain}`
    const statusListUrl = `https://${domain}/.well-known/status-list/${id}`

    const { encodedList } = await createStatusList({
      id: statusListUrl,
      issuerDID: issuerDid,
      length: DEFAULT_LIST_LENGTH,
    })

    const entity = await this.statusListRepo.create({
      listId: id,
      issuerDid,
      encodedList,
      purpose: 'revocation',
      totalEntries: DEFAULT_LIST_LENGTH,
      nextIndex: 0,
    })

    this.logger.log(`Status list '${id}' created (${DEFAULT_LIST_LENGTH} entries)`)
    return entity
  }

  /**
   * Allocate the next available status index.
   * Uses pessimistic locking to ensure uniqueness.
   */
  async allocateIndex(listId?: string): Promise<{
    index: number
    statusListId: string
    statusListUrl: string
  }> {
    const id = listId ?? DEFAULT_LIST_ID

    // Ensure list exists
    await this.getOrCreateStatusList(id)

    const index = await this.statusListRepo.incrementNextIndex(id)
    const domain = this.config.get<string>('NODE_DOMAIN', 'localhost')
    const statusListUrl = `https://${domain}/.well-known/status-list/${id}`

    return {
      index,
      statusListId: id,
      statusListUrl,
    }
  }

  /**
   * Revoke a VC at a specific index in the status list.
   */
  async revokeAtIndex(listId: string, index: number): Promise<void> {
    const entity = await this.getOrCreateStatusList(listId)
    const updatedEncodedList = await setRevoked(entity.encodedList, index, true)
    await this.statusListRepo.updateEncodedList(listId, updatedEncodedList)
    this.logger.log(`Revoked index ${index} in status list '${listId}'`)
  }

  /**
   * Build a StatusListCredential from the stored encoded list.
   * Returns an unsigned credential (proof to be added by signing layer).
   */
  async getStatusListCredential(listId: string): Promise<StatusListCredential> {
    const entity = await this.getOrCreateStatusList(listId)
    const domain = this.config.get<string>('NODE_DOMAIN', 'localhost')
    const statusListUrl = `https://${domain}/.well-known/status-list/${listId}`

    return buildStatusListCredential(
      {
        id: statusListUrl,
        issuerDID: entity.issuerDid,
      },
      entity.encodedList,
    )
  }
}
