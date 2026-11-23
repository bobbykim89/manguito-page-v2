import type { ApiErrorCode, ApiErrorDetail } from '#shared/types'
import { ApiError, isApiFailure, toApiError } from '@/utils/apiError'

/** The code of an ApiError, or of a useApi error's envelope. */
const errorCode = (err: unknown): ApiErrorCode | null => {
  if (err instanceof ApiError) return err.code
  if (err && typeof err === 'object' && 'data' in err && isApiFailure(err.data))
    return err.data.error.code
  return null
}

/**
 * A failure's message; for a validation failure with exactly one invalid
 * field, that field's own message, which says what to fix.
 */
const failureMessage = (
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetail[],
): string =>
  code === 'VALIDATION_FAILED' && details?.length === 1
    ? details[0]!.message
    : message

export const useErrorCheck = () => {
  const extractMessage = (err: unknown): string => {
    if (err instanceof ApiError)
      return failureMessage(err.code, err.message, err.details)
    if (
      err &&
      typeof err === 'object' &&
      'data' in err &&
      isApiFailure(err.data)
    ) {
      const { code, message, details } = err.data.error
      return failureMessage(code, message, details)
    }
    // a fetch that failed without an envelope (network, proxy): ofetch's own
    // message names the URL and status, so show the generic one instead
    if (
      err &&
      typeof err === 'object' &&
      ('statusCode' in err || 'response' in err)
    )
      return toApiError(err).message
    if (err instanceof Error) return err.message
    return 'Unknown Error.'
  }

  /** True only for a dead session; a refusal or wrong password is not one. */
  const isAuthError = (err: unknown): boolean =>
    errorCode(err) === 'UNAUTHENTICATED'

  return { extractMessage, isAuthError }
}
