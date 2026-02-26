import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCreditTransfersTable20260201120004 implements MigrationInterface {
  name = 'CreateCreditTransfersTable20260201120004'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE credit_transfers (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transfer_id     VARCHAR(100) UNIQUE NOT NULL,
        student_id      VARCHAR(20) NOT NULL REFERENCES students(student_id),
        source_vc_id    VARCHAR(255) NOT NULL,
        source_course   VARCHAR(50)  NOT NULL,
        target_node     VARCHAR(100) NOT NULL,
        target_course   VARCHAR(50),
        status          VARCHAR(20) DEFAULT 'pending',
        reviewed_by     VARCHAR(200),
        review_note     TEXT,
        transfer_vc_id  VARCHAR(255),
        requested_at    TIMESTAMP WITH TIME ZONE DEFAULT now(),
        reviewed_at     TIMESTAMP WITH TIME ZONE,
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE INDEX idx_credit_transfers_student_id ON credit_transfers(student_id)
    `)

    await queryRunner.query(`
      CREATE INDEX idx_credit_transfers_status ON credit_transfers(status)
    `)

    await queryRunner.query(`
      CREATE INDEX idx_credit_transfers_target_node ON credit_transfers(target_node)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_credit_transfers_target_node`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_credit_transfers_status`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_credit_transfers_student_id`)
    await queryRunner.query(`DROP TABLE IF EXISTS credit_transfers`)
  }
}
