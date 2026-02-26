import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCourseOutcomesTable20260223120003 implements MigrationInterface {
  name = 'CreateCourseOutcomesTable20260223120003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE course_outcomes (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        outcome_id      VARCHAR(100) UNIQUE NOT NULL,
        course_id       VARCHAR(50) NOT NULL REFERENCES courses(course_id),
        full_statement  TEXT NOT NULL,
        full_statement_th TEXT,
        coding_scheme   VARCHAR(50),
        education_level VARCHAR(50),
        bloom_level     VARCHAR(50),
        sort_order      INTEGER DEFAULT 0,
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE INDEX idx_course_outcomes_course_id ON course_outcomes(course_id)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_course_outcomes_course_id`)
    await queryRunner.query(`DROP TABLE IF EXISTS course_outcomes`)
  }
}
