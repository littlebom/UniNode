import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('courses')
export class CourseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'course_id', unique: true, length: 50 })
  courseId!: string

  @Column({ name: 'course_name', length: 200 })
  courseName!: string

  @Column({ name: 'course_name_th', type: 'varchar', length: 200, nullable: true })
  courseNameTH!: string | null

  @Column({ type: 'int' })
  credits!: number

  @Column({ name: 'course_type', type: 'varchar', length: 50, nullable: true })
  courseType!: string | null

  @Column({ name: 'delivery_mode', type: 'varchar', length: 20, nullable: true })
  deliveryMode!: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  faculty!: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  department!: string | null

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ name: 'description_th', type: 'text', nullable: true })
  descriptionTH!: string | null

  @Column({ type: 'text', array: true, nullable: true })
  prerequisites!: string[] | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  language!: string | null

  @Column({ name: 'is_active', default: true })
  isActive!: boolean

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt!: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
