import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPublicKeyToStudents1708771200000 implements MigrationInterface {
  name = '2026-02-24-120000-add-public-key-to-students'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE students ADD COLUMN public_key TEXT`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE students DROP COLUMN IF EXISTS public_key`,
    )
  }
}
