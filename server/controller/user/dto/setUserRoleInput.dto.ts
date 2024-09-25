import { z } from 'zod'

export const setUserRoleInputSchema = z.object({
  role: z.string().refine((role) => /(MANAGER|USER)/.test(role)),
})

export type UserRoleInput = z.infer<typeof setUserRoleInputSchema>
