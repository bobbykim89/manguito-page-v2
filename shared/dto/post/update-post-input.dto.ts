import { z } from 'zod'
import { captionSchema } from '../limits'

export const updatePostInputSchema = z.object({
  content: captionSchema,
})

export type UpdatePostInput = z.infer<typeof updatePostInputSchema>
