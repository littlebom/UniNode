import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCourseAssessmentsTable20260223120005 implements MigrationInterface {
  name = 'CreateCourseAssessmentsTable20260223120005'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE course_assessments (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id       VARCHAR(50) NOT NULL REFERENCES courses(course_id),
        assessment_type VARCHAR(100) NOT NULL,
        weight          INTEGER NOT NULL,
        description     TEXT,
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE INDEX idx_course_assessments_course_id ON course_assessments(course_id)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_course_assessments_course_id`)
    await queryRunner.query(`DROP TABLE IF EXISTS course_assessments`)
  }
}
