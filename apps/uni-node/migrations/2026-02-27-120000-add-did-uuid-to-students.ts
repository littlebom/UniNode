import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDidUuidToStudents20260227120000 implements MigrationInterface {
  name = 'AddDidUuidToStudents20260227120000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add did_uuid column linking to Registry student identity UUID
    await queryRunner.query(
      `ALTER TABLE students ADD COLUMN did_uuid UUID`,
    )

    // Add did_web column for the new central DID format
    await queryRunner.query(
      `ALTER TABLE students ADD COLUMN did_web VARCHAR(255)`,
    )

    // Partial indexes for non-null lookups
    await queryRunner.query(
      `CREATE INDEX idx_students_did_uuid ON students (did_uuid) WHERE did_uuid IS NOT NULL`,
    )
    await queryRunner.query(
      `CREATE INDEX idx_students_did_web ON students (did_web) WHERE did_web IS NOT NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_students_did_web`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_students_did_uuid`)
    await queryRunner.query(`ALTER TABLE students DROP COLUMN IF EXISTS did_web`)
    await queryRunner.query(`ALTER TABLE students DROP COLUMN IF EXISTS did_uuid`)
  }
}
