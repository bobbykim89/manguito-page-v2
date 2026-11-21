import type { ApiErrorCode, ApiErrorDetail, ApiFailure } from '#shared/types'

const UNREACHABLE = 'Could not reach the server, please try again.'

/** A failed /api call, built from the error envelope. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
    public details?: ApiErrorDetail[],
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Whether a value is the `{ ok: false, error }` envelope. */
export const isApiFailure = (value: unknown): value is ApiFailure =>
  !!value &&
  typeof value === 'object' &&
  'ok' in value &&
  value.ok === false &&
  'error' in value &&
  !!value.error &&
  typeof value.error === 'object' &&
  'code' in value.error &&
  'message' in value.error

/**
 * Turns whatever a failed fetch threw into an ApiError. A failure without an
 * envelope (the network is down, or a proxy answered) reads as unreachable.
 */
export const toApiError = (err: unknown): ApiError => {
  if (err instanceof ApiError) return err
  if (err && typeof err === 'object' && 'data' in err) {
    const data = err.data
    if (isApiFailure(data)) {
      const status =
        'status' in err && typeof err.status === 'number' ? err.status : 0
      return new ApiError(
        status,
        data.error.code,
        data.error.message,
        data.error.details,
      )
    }
  }
  return new ApiError(0, 'INTERNAL', UNREACHABLE)
}
