import { z } from 'zod'

export const outcomeSchema = z.object({
  identifier: z.string().optional(),
  fullStatement: z.string().min(1, 'กรุณากรอกคำอธิบาย Learning Outcome'),
  humanCodingScheme: z.string().optional(),
  bloomLevel: z.enum([
    'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create',
  ]).optional(),
  sortOrder: z.number().int().min(1),
})

export type OutcomeFormValues = z.infer<typeof outcomeSchema>

export const syllabusSchema = z.object({
  week: z.number().int().min(1).max(16),
  topic: z.string().min(1, 'กรุณากรอกหัวข้อ'),
  description: z.string().optional(),
})

export type SyllabusFormValues = z.infer<typeof syllabusSchema>

export const assessmentSchema = z.object({
  type: z.string().min(1, 'กรุณาระบุประเภทการประเมิน'),
  weight: z.number().min(0).max(100),
})

export type AssessmentFormValues = z.infer<typeof assessmentSchema>

export const courseFormSchema = z.object({
  courseId: z.string().min(1, 'กรุณากรอกรหัสวิชา'),
  courseName: z.string().min(1, 'กรุณากรอกชื่อวิชา (EN)'),
  courseNameTH: z.string().min(1, 'กรุณากรอกชื่อวิชา (TH)'),
  credits: z.number().int().min(1, 'จำนวนหน่วยกิตต้องอย่างน้อย 1').max(12),
  courseType: z.string().min(1, 'กรุณาเลือกประเภทการสอน'),
  deliveryMode: z.enum(['Onsite', 'Online', 'Hybrid'], {
    required_error: 'กรุณาเลือกรูปแบบการสอน',
  }),
  faculty: z.string().min(1, 'กรุณาระบุคณะ'),
  department: z.string().optional(),
  description: z.string().optional(),
  descriptionTH: z.string().optional(),
  prerequisites: z.array(z.string()).optional(),
  language: z.string().optional(),
  outcomes: z.array(outcomeSchema).optional(),
  syllabus: z.array(syllabusSchema).optional(),
  assessments: z.array(assessmentSchema).optional(),
})

export type CourseFormValues = z.infer<typeof courseFormSchema>
