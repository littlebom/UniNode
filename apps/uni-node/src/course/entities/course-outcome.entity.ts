import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('course_outcomes')
export class CourseOutcomeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'outcome_id', unique: true, length: 100 })
  outcomeId!: string

  @Column({ name: 'course_id', length: 50 })
  courseId!: string

  @Column({ name: 'full_statement', type: 'text' })
  fullStatement!: string

  @Column({ name: 'full_statement_th', type: 'text', nullable: true })
  fullStatementTH!: string | null

  @Column({ name: 'coding_scheme', type: 'varchar', length: 50, nullable: true })
  codingScheme!: string | null

  @Column({ name: 'education_level', type: 'varchar', length: 50, nullable: true })
  educationLevel!: string | null

  @Column({ name: 'bloom_level', type: 'varchar', length: 50, nullable: true })
  bloomLevel!: string | null

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
