import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateExternalCredentialRequestsTable20260223120007
  implements MigrationInterface
{
  name = 'CreateExternalCredentialRequestsTable20260223120007'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE external_credential_requests (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id            VARCHAR(100) UNIQUE NOT NULL,
        student_id            VARCHAR(20) NOT NULL,
        platform              VARCHAR(50) NOT NULL,
        platform_tier         INTEGER NOT NULL,
        course_name           VARCHAR(255) NOT NULL,
        institution           VARCHAR(200) NOT NULL,
        completion_date       DATE NOT NULL,
        score                 DECIMAL(5,2),
        completion_hours      INTEGER,
        certificate_url       TEXT,
        certificate_pdf_url   TEXT,
        verification_url      TEXT,
        requested_course_id   VARCHAR(50),
        original_vc_id        TEXT,
        status                VARCHAR(20) DEFAULT 'pending',
        recognized_course_id  VARCHAR(50),
        recognized_credits    INTEGER,
        reviewed_by           VARCHAR(200),
        review_note           TEXT,
        issued_vc_id          VARCHAR(255),
        requested_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        decided_at            TIMESTAMP WITH TIME ZONE,
        created_at            TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE INDEX idx_external_cred_student_id
        ON external_credential_requests(student_id)
    `)

    await queryRunner.query(`
      CREATE INDEX idx_external_cred_status
        ON external_credential_requests(status)
    `)

    await queryRunner.query(`
      CREATE INDEX idx_external_cred_platform
        ON external_credential_requests(platform)
    `)

    await queryRunner.query(`
      CREATE INDEX idx_external_cred_requested_at
        ON external_credential_requests(requested_at DESC)
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_external_cred_student_platform_course
        ON external_credential_requests(student_id, platform, course_name)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_external_cred_student_platform_course`,
    )
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_external_cred_requested_at`,
    )
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_external_cred_platform`,
    )
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_external_cred_status`,
    )
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_external_cred_student_id`,
    )
    await queryRunner.query(
      `DROP TABLE IF EXISTS external_credential_requests`,
    )
  }
}
