import { createHash, randomBytes } from 'node:crypto'

/** SHA-256 hex digest of a reset token; only this is stored. */
export const digestResetToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')

/**
 * A new password-reset token: 32 random bytes as hex for the email link, and
 * its digest for the database. A fast hash is enough for a 256-bit random
 * value, and it keeps the lookup a plain equality match.
 */
export const createResetToken = (): { token: string; digest: string } => {
  const token = randomBytes(32).toString('hex')
  return { token, digest: digestResetToken(token) }
}
