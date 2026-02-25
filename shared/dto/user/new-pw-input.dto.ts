import { z } from 'zod'
import { passwordSchema } from './user-input.dto'

export const pwUpdateInputSchema = z.object({
  currentPassword: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' }),
  newPassword: passwordSchema,
})

export type PwUpdateInput = z.infer<typeof pwUpdateInputSchema>
