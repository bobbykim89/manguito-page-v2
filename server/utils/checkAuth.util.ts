import { useRuntimeConfig } from '#imports'
import type { EventHandlerRequest, H3Event } from 'h3'
import { getRequestHeader } from 'h3'
import { apiError } from './apiError.util'
import jwt from 'jsonwebtoken'

export const checkAuth = (event: H3Event<EventHandlerRequest>) => {
  const config = useRuntimeConfig()
  const bearerToken = getRequestHeader(event, 'Authorization')

  // check if token exists
  if (!bearerToken) {
    throw apiError('UNAUTHENTICATED', 'No access token found, please log in.')
  }
  const token = bearerToken.replace('Bearer ', '')
  try {
    const decodedToken = jwt.verify(token, config.jwtSecret)
    event.context.user = decodedToken
  } catch {
    throw apiError(
      'UNAUTHENTICATED',
      'Access token is not valid, please log in again.',
    )
  }
}
