import { z } from 'zod'

export const tokenEmailInputSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
})

export type TokenEmailInput = z.infer<typeof tokenEmailInputSchema>
