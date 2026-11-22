import { z } from 'zod'
import { emailSchema } from '../limits'

export const authInputSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' }),
})

export type AuthInput = z.infer<typeof authInputSchema>
