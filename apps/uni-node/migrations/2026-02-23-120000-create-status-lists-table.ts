import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateStatusListsTable20260223120000 implements MigrationInterface {
  name = 'CreateStatusListsTable20260223120000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE status_lists (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        list_id         VARCHAR(50) UNIQUE NOT NULL,
        issuer_did      VARCHAR(255) NOT NULL,
        encoded_list    TEXT NOT NULL,
        purpose         VARCHAR(20) DEFAULT 'revocation',
        total_entries   INTEGER DEFAULT 131072,
        next_index      INTEGER DEFAULT 0,
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS status_lists`)
  }
}
