import { z } from 'zod'

export const sisConfigSchema = z.object({
  sisApiUrl: z.string().url('กรุณากรอก URL ที่ถูกต้อง'),
})

export type SISConfigFormValues = z.infer<typeof sisConfigSchema>

export const registryConfigSchema = z.object({
  registryUrl: z.string().url('กรุณากรอก URL ที่ถูกต้อง'),
  syncEnabled: z.boolean(),
  syncCron: z
    .string()
    .min(9, 'กรุณากรอก Cron Expression ที่ถูกต้อง (เช่น 0 2 * * *)'),
})

export type RegistryConfigFormValues = z.infer<typeof registryConfigSchema>
