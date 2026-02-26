import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPublicKeyToStudents20260224120000 implements MigrationInterface {
  name = 'AddPublicKeyToStudents20260224120000'

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
