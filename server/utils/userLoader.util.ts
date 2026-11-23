import { User, type UserModel } from '#shared/models'
import DataLoader from 'dataloader'
import type { H3Event } from 'h3'
import type { HydratedDocument } from 'mongoose'
import { apiError } from './apiError.util'

type UserDoc = HydratedDocument<UserModel>

declare module 'h3' {
  interface H3EventContext {
    userLoader?: DataLoader<string, UserDoc | null>
  }
}

/**
 * This request's user loader: it batches user lookups by id into one query
 * and remembers them, so a request reads each user at most once. Documents
 * are hydrated, not lean, so schema defaults (like `role`) are filled in for
 * old documents that lack them. Never read a user through it after changing
 * that user in the same request; use what the write returned.
 */
export const userLoader = (e: H3Event): DataLoader<string, UserDoc | null> => {
  e.context.userLoader ??= new DataLoader<string, UserDoc | null>(
    async (ids) => {
      const users = await User.find({ _id: { $in: ids } }).select('-password')
      const byId = new Map(users.map((u) => [u.id as string, u]))
      return ids.map((id) => byId.get(id) ?? null)
    },
  )
  return e.context.userLoader
}

/** The logged-in user (no password), loaded once per request. */
export const getCurrentUser = async (e: H3Event): Promise<UserDoc> => {
  const user = await userLoader(e).load(String(e.context.user.id))
  if (!user) {
    throw apiError('UNAUTHENTICATED', 'Session expired, please log in again')
  }
  return user
}
