import {
  API_ERROR_STATUS,
  type ApiErrorCode,
  type ApiErrorDetail,
  type ApiFailure,
} from '#shared/types'
import { createError, type H3Error, isError } from 'h3'

const GENERIC = 'Something went wrong, please try again.'

interface ApiErrorData {
  code: ApiErrorCode
  message: string
  details?: ApiErrorDetail[]
}

const isApiErrorCode = (value: unknown): value is ApiErrorCode =>
  typeof value === 'string' && Object.hasOwn(API_ERROR_STATUS, value)

/**
 * The error a controller or middleware throws. It carries its code, and its
 * status matches the code even if something other than defineApiRoute sees it.
 */
export const apiError = (
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetail[],
): H3Error<ApiErrorData> =>
  createError<ApiErrorData>({
    statusCode: API_ERROR_STATUS[code],
    statusMessage: message,
    message,
    data: details ? { code, message, details } : { code, message },
  })

const failure = (
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetail[],
): { status: number; body: ApiFailure } => ({
  status: API_ERROR_STATUS[code],
  body: {
    ok: false,
    error: details ? { code, message, details } : { code, message },
  },
})

const codeForStatus = (status: number): ApiErrorCode => {
  switch (status) {
    case 401:
      return 'UNAUTHENTICATED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 413:
    case 415:
      return 'UNSUPPORTED_MEDIA_TYPE'
    default:
      return 'VALIDATION_FAILED'
  }
}

type ZodLikeIssue = { path: PropertyKey[]; message: string }

const zodIssues = (data: unknown): ZodLikeIssue[] | null => {
  if (!data || typeof data !== 'object' || !('issues' in data)) return null
  return Array.isArray(data.issues) ? (data.issues as ZodLikeIssue[]) : null
}

/**
 * Turns anything thrown while handling an /api request into the error
 * envelope and its status. Unknown errors are logged and answered with a
 * generic message, so server internals never reach the client.
 */
export const toApiFailure = (
  err: unknown,
): { status: number; body: ApiFailure } => {
  if (isError(err)) {
    const data = err.data as Partial<ApiErrorData> | undefined
    if (data && isApiErrorCode(data.code) && typeof data.message === 'string') {
      return failure(data.code, data.message, data.details)
    }
    const issues = zodIssues(err.data)
    if (issues) {
      return failure(
        'VALIDATION_FAILED',
        'Some fields are invalid.',
        issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      )
    }
  }
  if (err instanceof Error) {
    if (['CastError', 'BSONError', 'ValidationError'].includes(err.name)) {
      return failure('VALIDATION_FAILED', 'That id is not valid.')
    }
    if ((err as { code?: unknown }).code === 11000) {
      return failure('CONFLICT', 'That value is already in use.')
    }
  }
  if (isError(err) && err.statusCode >= 400 && err.statusCode < 500) {
    return failure(
      codeForStatus(err.statusCode),
      err.statusMessage || err.message || GENERIC,
    )
  }
  console.error(err)
  return failure('INTERNAL', GENERIC)
}
