import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateNodeConfigTable20260227130000 implements MigrationInterface {
  name = 'CreateNodeConfigTable20260227130000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE node_config (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        registry_url  VARCHAR(500),
        sync_enabled  BOOLEAN,
        sync_cron     VARCHAR(50),
        updated_at    TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `)

    // Insert singleton default row
    await queryRunner.query(`
      INSERT INTO node_config (id) VALUES (gen_random_uuid())
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS node_config`)
  }
}
