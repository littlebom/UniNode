import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('course_offerings')
export class CourseOfferingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'offering_id', unique: true, length: 100 })
  offeringId!: string

  @Column({ name: 'course_id', length: 50 })
  courseId!: string

  @Column({ name: 'academic_year', length: 10 })
  academicYear!: string

  @Column({ length: 5 })
  semester!: string

  @Column({ type: 'varchar', length: 10, nullable: true })
  section!: string | null

  @Column({ name: 'delivery_mode', type: 'varchar', length: 20, nullable: true })
  deliveryMode!: string | null

  @Column({ name: 'max_enrollment', type: 'int', nullable: true })
  maxEnrollment!: number | null

  @Column({ name: 'enrolled_count', type: 'int', default: 0 })
  enrolledCount!: number

  @Column({ length: 20, default: 'active' })
  status!: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
