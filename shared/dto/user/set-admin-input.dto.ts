import { z } from 'zod'

export const setAdminInputSchema = z.object({
  phrase: z.string(),
})

export type SetAdminInput = z.infer<typeof setAdminInputSchema>
