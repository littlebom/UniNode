import { z } from 'zod'

export const transferDecisionSchema = z.object({
  reviewNote: z.string().min(1, 'กรุณากรอก Review Note ก่อนตัดสินใจ'),
})

export type TransferDecisionFormValues = z.infer<typeof transferDecisionSchema>
