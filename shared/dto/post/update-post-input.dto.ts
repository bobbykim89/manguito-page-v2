import { z } from 'zod'

export const updatePostInputSchema = z.object({
  content: z.string(),
})

export type UpdatePostInput = z.infer<typeof updatePostInputSchema>
