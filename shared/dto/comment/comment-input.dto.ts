import { z } from 'zod'

export const commentInputSchema = z.object({
  text: z.string(),
})

export type CommentInput = z.infer<typeof commentInputSchema>
