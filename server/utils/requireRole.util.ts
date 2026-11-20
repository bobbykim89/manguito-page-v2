import { User, type UserRoleType } from '#shared/models'
import { createError, type H3Event } from 'h3'

/**
 * Request middleware for after checkAuth: refuses users whose role isn't in
 * `roles`. Put it before anything with side effects, like an upload.
 */
export const requireRole =
  (...roles: UserRoleType[]) =>
  async (e: H3Event): Promise<void> => {
    const user = await User.findById(e.context.user.id, 'role')
    if (!user) {
      throw createError({
        status: 401,
        message: 'Unauthorized',
        statusMessage: 'Session expired, please log in again',
      })
    }
    if (!roles.includes(user.role)) {
      throw createError({
        status: 401,
        message: 'Access denied',
        statusMessage: 'Access denied: unauthorized user',
      })
    }
  }
