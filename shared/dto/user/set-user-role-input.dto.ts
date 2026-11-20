import { z } from 'zod'

export const setUserRoleInputSchema = z.object({
  role: z.enum(['MANAGER', 'USER']),
})

export type UserRoleInput = z.infer<typeof setUserRoleInputSchema>
