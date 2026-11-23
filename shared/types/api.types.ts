/** Every error code an /api response can carry. */
export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'UPSTREAM_FAILED'
  | 'INTERNAL'

/** One invalid field of a request. */
export type ApiErrorDetail = { path: string; message: string }

export type ApiSuccess<T> = { ok: true; data: T }

export type ApiFailure = {
  ok: false
  error: { code: ApiErrorCode; message: string; details?: ApiErrorDetail[] }
}

/** The body of every /api response. */
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

/** The HTTP status that goes with each error code. */
export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UPSTREAM_FAILED: 502,
  INTERNAL: 500,
}
