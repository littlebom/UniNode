"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateIssuedVcsTable20260201120003 = void 0;
class CreateIssuedVcsTable20260201120003 {
    name = 'CreateIssuedVcsTable20260201120003';
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE issued_vcs (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vc_id           VARCHAR(255) UNIQUE NOT NULL,
        student_id      VARCHAR(20) NOT NULL REFERENCES students(student_id),
        vc_type         VARCHAR(50) NOT NULL,
        course_id       VARCHAR(50),
        vc_document     JSONB NOT NULL,
        status_index    INTEGER,
        status          VARCHAR(20) DEFAULT 'active',
        issued_at       TIMESTAMP WITH TIME ZONE DEFAULT now(),
        revoked_at      TIMESTAMP WITH TIME ZONE,
        revoke_reason   TEXT,
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX idx_issued_vcs_student_id ON issued_vcs(student_id)
    `);
        await queryRunner.query(`
      CREATE INDEX idx_issued_vcs_vc_type ON issued_vcs(vc_type)
    `);
        await queryRunner.query(`
      CREATE INDEX idx_issued_vcs_status ON issued_vcs(status)
    `);
        await queryRunner.query(`
      CREATE INDEX idx_issued_vcs_course_id ON issued_vcs(course_id)
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_issued_vcs_course_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_issued_vcs_status`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_issued_vcs_vc_type`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_issued_vcs_student_id`);
        await queryRunner.query(`DROP TABLE IF EXISTS issued_vcs`);
    }
}
exports.CreateIssuedVcsTable20260201120003 = CreateIssuedVcsTable20260201120003;
//# sourceMappingURL=2026-02-01-120003-create-issued-vcs-table.js.map