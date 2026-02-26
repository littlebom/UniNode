import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm'

@Entity('sync_logs')
export class SyncLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'sync_type', length: 50 })
  syncType!: string

  @Column({ length: 20 })
  status!: string

  @Column({ name: 'node_id', length: 100 })
  nodeId!: string

  @Column({ name: 'academic_year', type: 'varchar', length: 10, nullable: true })
  academicYear!: string | null

  @Column({ type: 'varchar', length: 5, nullable: true })
  semester!: string | null

  @Column({ name: 'course_count', type: 'int', nullable: true })
  courseCount!: number | null

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null

  @Column({ type: 'jsonb', nullable: true })
  response!: Record<string, unknown> | null

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
