import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('status_lists')
export class StatusListEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'list_id', unique: true, length: 50 })
  listId!: string

  @Column({ name: 'issuer_did', length: 255 })
  issuerDid!: string

  @Column({ name: 'encoded_list', type: 'text' })
  encodedList!: string

  @Column({ length: 20, default: 'revocation' })
  purpose!: string

  @Column({ name: 'total_entries', type: 'int', default: 131072 })
  totalEntries!: number

  @Column({ name: 'next_index', type: 'int', default: 0 })
  nextIndex!: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
