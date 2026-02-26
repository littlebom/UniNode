import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCourseSyllabusTable20260223120004 implements MigrationInterface {
  name = 'CreateCourseSyllabusTable20260223120004'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE course_syllabus (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id       VARCHAR(50) NOT NULL REFERENCES courses(course_id),
        week            INTEGER NOT NULL,
        topic           VARCHAR(500) NOT NULL,
        topic_th        VARCHAR(500),
        description     TEXT,
        resources       TEXT[],
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE(course_id, week)
      )
    `)

    await queryRunner.query(`
      CREATE INDEX idx_course_syllabus_course_id ON course_syllabus(course_id)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_course_syllabus_course_id`)
    await queryRunner.query(`DROP TABLE IF EXISTS course_syllabus`)
  }
}
