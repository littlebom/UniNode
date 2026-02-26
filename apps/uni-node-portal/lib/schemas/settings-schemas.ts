import { z } from 'zod'

export const sisConfigSchema = z.object({
  sisApiUrl: z.string().url('กรุณากรอก URL ที่ถูกต้อง'),
})

export type SISConfigFormValues = z.infer<typeof sisConfigSchema>
