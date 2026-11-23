import { z } from 'zod'
import { emailSchema } from '../limits'

export const tokenEmailInputSchema = z.object({
  email: emailSchema,
})

export type TokenEmailInput = z.infer<typeof tokenEmailInputSchema>
