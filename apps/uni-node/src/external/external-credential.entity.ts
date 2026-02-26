import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('external_credential_requests')
export class ExternalCredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'request_id', unique: true, length: 100 })
  requestId!: string

  @Column({ name: 'student_id', length: 20 })
  studentId!: string

  @Column({ length: 50 })
  platform!: string

  @Column({ name: 'platform_tier', type: 'int' })
  platformTier!: number

  @Column({ name: 'course_name', length: 255 })
  courseName!: string

  @Column({ length: 200 })
  institution!: string

  @Column({ name: 'completion_date', type: 'date' })
  completionDate!: Date

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score!: number | null

  @Column({ name: 'completion_hours', type: 'int', nullable: true })
  completionHours!: number | null

  @Column({ name: 'certificate_url', type: 'text', nullable: true })
  certificateUrl!: string | null

  @Column({ name: 'certificate_pdf_url', type: 'text', nullable: true })
  certificatePdfUrl!: string | null

  @Column({ name: 'verification_url', type: 'text', nullable: true })
  verificationUrl!: string | null

  @Column({ name: 'requested_course_id', type: 'varchar', length: 50, nullable: true })
  requestedCourseId!: string | null

  @Column({ name: 'original_vc_id', type: 'text', nullable: true })
  originalVcId!: string | null

  @Column({ length: 20, default: 'pending' })
  status!: string

  @Column({ name: 'recognized_course_id', type: 'varchar', length: 50, nullable: true })
  recognizedCourseId!: string | null

  @Column({ name: 'recognized_credits', type: 'int', nullable: true })
  recognizedCredits!: number | null

  @Column({ name: 'reviewed_by', type: 'varchar', length: 200, nullable: true })
  reviewedBy!: string | null

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote!: string | null

  @Column({ name: 'issued_vc_id', type: 'varchar', length: 255, nullable: true })
  issuedVcId!: string | null

  @Column({ name: 'requested_at', type: 'timestamptz' })
  requestedAt!: Date

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt!: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
