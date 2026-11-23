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

/**
 * The most a new post's photo may weigh: the browser sizes photos under it,
 * and the server refuses anything over it. It leaves room under Vercel's
 * 4.5 MB request limit for the caption and the form framing.
 */
export const UPLOAD_BUDGET = 4 * 1024 * 1024

export const UPLOAD_MESSAGES = {
  unreadable:
    "This photo's format can't be read here. Please choose a JPEG, PNG or WebP. On iPhone, Safari converts photos automatically.",
  inputTooLarge: 'This photo is over 50 MB. Please choose a smaller one.',
  tooLarge: 'This photo is too large to upload. Please choose a smaller one.',
  noFile: 'Please choose a photo to upload.',
  badType: 'Please upload a JPEG, PNG or WebP image.',
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
