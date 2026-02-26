import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateSyncLogsTable20260223120006 implements MigrationInterface {
  name = 'CreateSyncLogsTable20260223120006'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE sync_logs (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sync_type       VARCHAR(50) NOT NULL,
        status          VARCHAR(20) NOT NULL,
        node_id         VARCHAR(100) NOT NULL,
        academic_year   VARCHAR(10),
        semester        VARCHAR(5),
        course_count    INTEGER,
        payload         JSONB,
        response        JSONB,
        error_message   TEXT,
        started_at      TIMESTAMP WITH TIME ZONE NOT NULL,
        completed_at    TIMESTAMP WITH TIME ZONE,
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE INDEX idx_sync_logs_sync_type ON sync_logs(sync_type)
    `)

    await queryRunner.query(`
      CREATE INDEX idx_sync_logs_status ON sync_logs(status)
    `)

    await queryRunner.query(`
      CREATE INDEX idx_sync_logs_node_id ON sync_logs(node_id)
    `)

    await queryRunner.query(`
      CREATE INDEX idx_sync_logs_started_at ON sync_logs(started_at DESC)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sync_logs_started_at`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sync_logs_node_id`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sync_logs_status`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sync_logs_sync_type`)
    await queryRunner.query(`DROP TABLE IF EXISTS sync_logs`)
  }
}
