import { z } from 'zod'

export const externalReviewSchema = z.object({
  recognizedCourseId: z.string().min(1, 'กรุณาเลือกวิชาที่จะ Recognize'),
  recognizedCredits: z.number().int().min(1, 'จำนวนหน่วยกิตต้องอย่างน้อย 1').max(12),
  note: z.string().optional(),
})

export type ExternalReviewFormValues = z.infer<typeof externalReviewSchema>
