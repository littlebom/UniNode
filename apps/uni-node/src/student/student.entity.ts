import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('students')
export class StudentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'student_id', unique: true, length: 20 })
  studentId!: string

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  did!: string | null

  @Column({ name: 'wallet_endpoint', type: 'text', nullable: true })
  walletEndpoint!: string | null

  @Column({ name: 'fcm_token', type: 'text', nullable: true })
  fcmToken!: string | null

  @Column({ name: 'public_key', type: 'text', nullable: true })
  publicKey!: string | null

  @Column({ length: 20, default: 'active' })
  status!: string

  @Column({ name: 'enrolled_at', type: 'timestamptz', nullable: true })
  enrolledAt!: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
