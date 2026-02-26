import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateStudentsTable20260201120000 implements MigrationInterface {
  name = 'CreateStudentsTable20260201120000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE students (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id      VARCHAR(20) UNIQUE NOT NULL,
        did             VARCHAR(255) UNIQUE,
        wallet_endpoint TEXT,
        fcm_token       TEXT,
        status          VARCHAR(20) DEFAULT 'active',
        enrolled_at     TIMESTAMP WITH TIME ZONE,
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE INDEX idx_students_status ON students(status)
    `)

    await queryRunner.query(`
      CREATE INDEX idx_students_did ON students(did)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_students_did`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_students_status`)
    await queryRunner.query(`DROP TABLE IF EXISTS students`)
  }
}
