import { z } from 'zod'

/** How many posts a page of GET /api/post holds unless `limit` says otherwise. */
export const POST_PAGE_SIZE = 30
export const POST_PAGE_MAX = 50

export const POST_PAGE_MESSAGES = {
  limit: `Please ask for between 1 and ${POST_PAGE_MAX} posts.`,
  cursor: "This list position isn't valid, please reload the page.",
} as const

/** `<epoch ms>_<ObjectId>`, as GET /api/post hands out in `nextCursor`. */
export const POST_CURSOR_PATTERN = /^\d{1,15}_[0-9a-f]{24}$/

export const postPageQuerySchema = z.object({
  limit: z.coerce
    .number({ message: POST_PAGE_MESSAGES.limit })
    .int({ message: POST_PAGE_MESSAGES.limit })
    .min(1, { message: POST_PAGE_MESSAGES.limit })
    .max(POST_PAGE_MAX, { message: POST_PAGE_MESSAGES.limit })
    .default(POST_PAGE_SIZE),
  cursor: z
    .string({ message: POST_PAGE_MESSAGES.cursor })
    .regex(POST_CURSOR_PATTERN, { message: POST_PAGE_MESSAGES.cursor })
    .optional(),
})

export type PostPageQuery = z.infer<typeof postPageQuerySchema>
