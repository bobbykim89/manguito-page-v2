import type { UserRoleType } from '#shared/models'
import type { H3Event } from 'h3'
import { apiError } from './apiError.util'
import { getCurrentUser } from './userLoader.util'

/**
 * Request middleware for after checkAuth: refuses users whose role isn't in
 * `roles`. Put it before anything with side effects, like an upload.
 */
export const requireRole =
  (...roles: UserRoleType[]) =>
  async (e: H3Event): Promise<void> => {
    const user = await getCurrentUser(e)
    if (!roles.includes(user.role)) {
      throw apiError('FORBIDDEN', 'Access denied: unauthorized user')
    }
  }
