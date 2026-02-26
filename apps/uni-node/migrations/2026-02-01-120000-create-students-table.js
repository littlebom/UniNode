"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateStudentsTable20260201120000 = void 0;
class CreateStudentsTable20260201120000 {
    name = 'CreateStudentsTable20260201120000';
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE students (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id      VARCHAR(20) UNIQUE NOT NULL,
        did             VARCHAR(255) UNIQUE,
        wallet_endpoint TEXT,
        fcm_token       TEXT,
        status          VARCHAR(20) DEFAULT 'active',
        enrolled_at     TIMESTAMP WITH TIME ZONE,
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX idx_students_status ON students(status)
    `);
        await queryRunner.query(`
      CREATE INDEX idx_students_did ON students(did)
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_students_did`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_students_status`);
        await queryRunner.query(`DROP TABLE IF EXISTS students`);
    }
}
exports.CreateStudentsTable20260201120000 = CreateStudentsTable20260201120000;
//# sourceMappingURL=2026-02-01-120000-create-students-table.js.map