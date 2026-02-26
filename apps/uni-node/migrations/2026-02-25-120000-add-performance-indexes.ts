import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPerformanceIndexes1709000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1709000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Issued VCs: fast lookup by student_id (most common query pattern)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_issued_vcs_student_id
      ON issued_vcs (student_id)
    `)

    // Issued VCs: filter by status for active/revoked VC queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_issued_vcs_status
      ON issued_vcs (status)
    `)

    // Issued VCs: fast lookup by vc_id (verification flow)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_issued_vcs_vc_id
      ON issued_vcs (vc_id)
    `)

    // Credit transfers: compound index for common query patterns
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_credit_transfers_source
      ON credit_transfers (source_vc_id, target_node, status)
    `)

    // Credit transfers: lookup by student for transfer history
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_credit_transfers_student_id
      ON credit_transfers (student_id)
    `)

    // Courses: filter active courses by faculty/department (catalog search)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_courses_active_search
      ON courses (is_active, faculty, department)
    `)

    // Courses: unique course_id for fast lookup
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_course_id
      ON courses (course_id)
    `)

    // Course outcomes: lookup by course_id for CASE document
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_course_outcomes_course_id
      ON course_outcomes (course_id)
    `)

    // Course syllabus: lookup by course_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_course_syllabus_course_id
      ON course_syllabus (course_id)
    `)

    // Course assessments: lookup by course_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_course_assessments_course_id
      ON course_assessments (course_id)
    `)

    // Students: fast lookup by student_id and DID
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_id
      ON students (student_id)
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_students_did
      ON students (did)
      WHERE did IS NOT NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_students_did')
    await queryRunner.query('DROP INDEX IF EXISTS idx_students_student_id')
    await queryRunner.query('DROP INDEX IF EXISTS idx_course_assessments_course_id')
    await queryRunner.query('DROP INDEX IF EXISTS idx_course_syllabus_course_id')
    await queryRunner.query('DROP INDEX IF EXISTS idx_course_outcomes_course_id')
    await queryRunner.query('DROP INDEX IF EXISTS idx_courses_course_id')
    await queryRunner.query('DROP INDEX IF EXISTS idx_courses_active_search')
    await queryRunner.query('DROP INDEX IF EXISTS idx_credit_transfers_student_id')
    await queryRunner.query('DROP INDEX IF EXISTS idx_credit_transfers_source')
    await queryRunner.query('DROP INDEX IF EXISTS idx_issued_vcs_vc_id')
    await queryRunner.query('DROP INDEX IF EXISTS idx_issued_vcs_status')
    await queryRunner.query('DROP INDEX IF EXISTS idx_issued_vcs_student_id')
  }
}
