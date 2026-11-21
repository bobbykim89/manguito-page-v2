import type { ApiErrorCode } from '#shared/types'
import { ApiError, isApiFailure } from '@/utils/apiError'

/** The code of an ApiError, or of a useApi error's envelope. */
const errorCode = (err: unknown): ApiErrorCode | null => {
  if (err instanceof ApiError) return err.code
  if (err && typeof err === 'object' && 'data' in err && isApiFailure(err.data))
    return err.data.error.code
  return null
}

export const useErrorCheck = () => {
  const extractMessage = (err: unknown): string => {
    if (err instanceof ApiError) return err.message
    if (
      err &&
      typeof err === 'object' &&
      'data' in err &&
      isApiFailure(err.data)
    )
      return err.data.error.message
    if (err instanceof Error) return err.message
    return 'Unknown Error.'
  }

  /** True only for a dead session; a refusal or wrong password is not one. */
  const isAuthError = (err: unknown): boolean =>
    errorCode(err) === 'UNAUTHENTICATED'

  return { extractMessage, isAuthError }
}
