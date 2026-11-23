import { useRuntimeConfig } from '#imports'
import type { EventHandlerRequest, H3Event } from 'h3'
import { getRequestHeader } from 'h3'
import { apiError } from './apiError.util'
import type { SessionClaims } from './sessionToken.util'
import { getCurrentUser } from './userLoader.util'
import jwt from 'jsonwebtoken'

/**
 * Verifies the access token and loads its user (through this request's
 * loader, so later steps reuse it). A missing user, or a token signed before
 * the user's last password reset, answers 401.
 */
export const checkAuth = async (
  event: H3Event<EventHandlerRequest>,
): Promise<void> => {
  const config = useRuntimeConfig()
  const bearerToken = getRequestHeader(event, 'Authorization')

  // check if token exists
  if (!bearerToken) {
    throw apiError('UNAUTHENTICATED', 'No access token found, please log in.')
  }
  const token = bearerToken.replace('Bearer ', '')
  let claims: SessionClaims
  try {
    claims = jwt.verify(token, config.jwtSecret) as SessionClaims
    event.context.user = claims
  } catch {
    throw apiError(
      'UNAUTHENTICATED',
      'Access token is not valid, please log in again.',
    )
  }
  const user = await getCurrentUser(event)
  // tokens and users from before versions existed count as 0
  if ((claims.v ?? 0) !== (user.tokenVersion ?? 0)) {
    throw apiError('UNAUTHENTICATED', 'Session expired, please log in again')
  }
}
