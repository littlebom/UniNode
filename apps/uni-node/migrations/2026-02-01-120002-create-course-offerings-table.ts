import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCourseOfferingsTable20260201120002 implements MigrationInterface {
  name = 'CreateCourseOfferingsTable20260201120002'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE course_offerings (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offering_id     VARCHAR(100) UNIQUE NOT NULL,
        course_id       VARCHAR(50) NOT NULL REFERENCES courses(course_id),
        academic_year   VARCHAR(10) NOT NULL,
        semester        VARCHAR(5)  NOT NULL,
        section         VARCHAR(10),
        delivery_mode   VARCHAR(20),
        max_enrollment  INTEGER,
        enrolled_count  INTEGER DEFAULT 0,
        status          VARCHAR(20) DEFAULT 'active',
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE INDEX idx_course_offerings_course_id ON course_offerings(course_id)
    `)

    await queryRunner.query(`
      CREATE INDEX idx_course_offerings_academic_year_semester
        ON course_offerings(academic_year, semester)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_course_offerings_academic_year_semester`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_course_offerings_course_id`)
    await queryRunner.query(`DROP TABLE IF EXISTS course_offerings`)
  }
}
