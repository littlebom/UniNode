import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('credit_transfers')
export class CreditTransferEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'transfer_id', unique: true, length: 100 })
  transferId!: string

  @Column({ name: 'student_id', length: 20 })
  studentId!: string

  /** Central DID of the student (did:web:unilink.ac.th:id:{uuid}) */
  @Column({ name: 'student_did', type: 'varchar', length: 255, nullable: true })
  studentDid!: string | null

  @Column({ name: 'source_vc_id', length: 255 })
  sourceVcId!: string

  @Column({ name: 'source_course', length: 50 })
  sourceCourse!: string

  @Column({ name: 'target_node', length: 100 })
  targetNode!: string

  @Column({ name: 'target_course', type: 'varchar', length: 50, nullable: true })
  targetCourse!: string | null

  @Column({ length: 20, default: 'pending' })
  status!: string

  @Column({ name: 'reviewed_by', type: 'varchar', length: 200, nullable: true })
  reviewedBy!: string | null

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote!: string | null

  @Column({ name: 'transfer_vc_id', type: 'varchar', length: 255, nullable: true })
  transferVcId!: string | null

  @Column({ name: 'requested_at', type: 'timestamptz' })
  requestedAt!: Date

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
