import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm'

@Entity('node_config')
export class NodeConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'registry_url', type: 'varchar', length: 500, nullable: true })
  registryUrl!: string | null

  @Column({ name: 'sync_enabled', type: 'boolean', nullable: true })
  syncEnabled!: boolean | null

  @Column({ name: 'sync_cron', type: 'varchar', length: 50, nullable: true })
  syncCron!: string | null

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
