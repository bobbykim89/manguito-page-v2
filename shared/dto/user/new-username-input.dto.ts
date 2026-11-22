import { z } from 'zod'
import { usernameSchema } from '../limits'

export const newUsernameInputSchema = z.object({
  username: usernameSchema,
})

export type NewUsernameInput = z.infer<typeof newUsernameInputSchema>
