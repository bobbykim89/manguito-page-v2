import { z } from 'zod'

export const newUsernameInputSchema = z.object({
  username: z.string(),
})

export type NewUsernameInput = z.infer<typeof newUsernameInputSchema>
