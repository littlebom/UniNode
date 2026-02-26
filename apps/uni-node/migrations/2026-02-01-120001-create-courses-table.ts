import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCoursesTable20260201120001 implements MigrationInterface {
  name = 'CreateCoursesTable20260201120001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE courses (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id       VARCHAR(50) UNIQUE NOT NULL,
        course_name     VARCHAR(200) NOT NULL,
        course_name_th  VARCHAR(200),
        credits         INTEGER NOT NULL,
        course_type     VARCHAR(50),
        delivery_mode   VARCHAR(20),
        faculty         VARCHAR(200),
        department      VARCHAR(200),
        description     TEXT,
        description_th  TEXT,
        prerequisites   TEXT[],
        language        VARCHAR(50),
        is_active       BOOLEAN DEFAULT true,
        last_synced_at  TIMESTAMP WITH TIME ZONE,
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE INDEX idx_courses_faculty ON courses(faculty)
    `)

    await queryRunner.query(`
      CREATE INDEX idx_courses_department ON courses(department)
    `)

    await queryRunner.query(`
      CREATE INDEX idx_courses_is_active ON courses(is_active)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_courses_is_active`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_courses_department`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_courses_faculty`)
    await queryRunner.query(`DROP TABLE IF EXISTS courses`)
  }
}
