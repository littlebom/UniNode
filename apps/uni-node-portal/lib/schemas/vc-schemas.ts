import { z } from 'zod'

export const issueVCSchema = z.object({
  studentId: z.string().min(1, 'กรุณากรอกรหัสนักศึกษา'),
  vcType: z.enum(['CourseCreditCredential', 'DegreeCredential', 'AchievementCredential'], {
    required_error: 'กรุณาเลือกประเภท VC',
  }),
  courseId: z.string().optional(),
  grade: z.enum(['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F', 'S', 'U']).optional(),
  gradePoint: z.number().min(0).max(4).optional(),
  semester: z.enum(['1', '2', 'S']).optional(),
  academicYear: z.string().regex(/^\d{4}$/, 'ปีการศึกษาต้องเป็น 4 หลัก (เช่น 2567)'),
  deliveryMode: z.enum(['Onsite', 'Online', 'Hybrid']).optional(),
  note: z.string().optional(),
})

export type IssueVCFormValues = z.infer<typeof issueVCSchema>

export const revokeVCSchema = z.object({
  reason: z.string().min(1, 'กรุณาระบุเหตุผลในการยกเลิก'),
})

export type RevokeVCFormValues = z.infer<typeof revokeVCSchema>
