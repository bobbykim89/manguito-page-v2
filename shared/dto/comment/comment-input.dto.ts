import { z } from 'zod'
import { commentTextSchema } from '../limits'

export const commentInputSchema = z.object({
  text: commentTextSchema,
})

export type CommentInput = z.infer<typeof commentInputSchema>
