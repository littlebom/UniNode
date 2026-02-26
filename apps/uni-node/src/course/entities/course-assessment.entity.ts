import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm'

@Entity('course_assessments')
export class CourseAssessmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'course_id', length: 50 })
  courseId!: string

  @Column({ name: 'assessment_type', length: 100 })
  assessmentType!: string

  @Column({ type: 'int' })
  weight!: number

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
