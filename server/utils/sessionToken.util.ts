import { useRuntimeConfig } from '#imports'
import jwt from 'jsonwebtoken'

/** The claims in a session token. Tokens from before `v` existed have none. */
export interface SessionClaims {
  id: string
  v?: number
}

/**
 * A "Bearer <jwt>" session token for this user, valid for 7 days or until
 * their tokenVersion changes (an email password reset).
 */
export const signSessionToken = (user: {
  _id: unknown
  tokenVersion?: number
}): string => {
  const claims: SessionClaims = {
    id: String(user._id),
    v: user.tokenVersion ?? 0,
  }
  const jwtToken = jwt.sign(claims, useRuntimeConfig().jwtSecret, {
    expiresIn: '7d',
  })
  return `Bearer ${jwtToken}`
}
