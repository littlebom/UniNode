import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm'

@Entity('issued_vcs')
export class IssuedVcEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'vc_id', unique: true, length: 255 })
  vcId!: string

  @Column({ name: 'student_id', length: 20 })
  studentId!: string

  @Column({ name: 'vc_type', length: 50 })
  vcType!: string

  @Column({ name: 'course_id', type: 'varchar', length: 50, nullable: true })
  courseId!: string | null

  @Column({ name: 'vc_document', type: 'jsonb' })
  vcDocument!: Record<string, unknown>

  @Column({ name: 'status_index', type: 'int', nullable: true })
  statusIndex!: number | null

  @Column({ length: 20, default: 'active' })
  status!: string

  @Column({ name: 'issued_at', type: 'timestamptz', nullable: true })
  issuedAt!: Date | null

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null

  @Column({ name: 'revoke_reason', type: 'text', nullable: true })
  revokeReason!: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
