import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStudentDidToTransfers20260227120001 implements MigrationInterface {
  name = 'AddStudentDidToTransfers20260227120001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE credit_transfers ADD COLUMN student_did VARCHAR(255)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE credit_transfers DROP COLUMN IF EXISTS student_did`,
    )
  }
}
