import { z } from 'zod'

/** Length limits, shared by the DTOs, the schemas and the client forms. */
export const LIMITS = {
  caption: 1000,
  comment: 500,
  username: 30,
  email: 254,
} as const

export const LIMIT_MESSAGES = {
  captionEmpty: 'Please write a caption.',
  captionLong: `Captions can be at most ${LIMITS.caption} characters.`,
  commentEmpty: 'Please write a comment.',
  commentLong: `Comments can be at most ${LIMITS.comment} characters.`,
  usernameEmpty: 'Please enter a username.',
  usernameLong: `Usernames can be at most ${LIMITS.username} characters.`,
  emailLong: `Email addresses can be at most ${LIMITS.email} characters.`,
} as const

/** An email, trimmed and lowercased so lookups ignore case. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(LIMITS.email, { message: LIMIT_MESSAGES.emailLong })
  .pipe(z.email({ message: 'Invalid email address' }))

export const captionSchema = z
  .string()
  .trim()
  .min(1, { message: LIMIT_MESSAGES.captionEmpty })
  .max(LIMITS.caption, { message: LIMIT_MESSAGES.captionLong })

export const commentTextSchema = z
  .string()
  .trim()
  .min(1, { message: LIMIT_MESSAGES.commentEmpty })
  .max(LIMITS.comment, { message: LIMIT_MESSAGES.commentLong })

export const usernameSchema = z
  .string()
  .trim()
  .min(1, { message: LIMIT_MESSAGES.usernameEmpty })
  .max(LIMITS.username, { message: LIMIT_MESSAGES.usernameLong })
