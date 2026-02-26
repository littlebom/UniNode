import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm'

@Entity('course_syllabus')
export class CourseSyllabusEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'course_id', length: 50 })
  courseId!: string

  @Column({ type: 'int' })
  week!: number

  @Column({ length: 500 })
  topic!: string

  @Column({ name: 'topic_th', type: 'varchar', length: 500, nullable: true })
  topicTH!: string | null

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ type: 'text', array: true, nullable: true })
  resources!: string[] | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
