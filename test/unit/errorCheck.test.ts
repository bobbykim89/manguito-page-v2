import { describe, expect, it } from 'vitest'
import { ApiError } from '@/utils/apiError'

const fromUseApi = (code: string) => ({
  data: { ok: false, error: { code, message: 'x' } },
})

describe('useErrorCheck', () => {
  const { isAuthError, extractMessage } = useErrorCheck()

  it('treats only UNAUTHENTICATED as an auth error', () => {
    expect(isAuthError(new ApiError(401, 'UNAUTHENTICATED', 'x'))).toBe(true)
    expect(isAuthError(fromUseApi('UNAUTHENTICATED'))).toBe(true)
    expect(isAuthError(new ApiError(401, 'INVALID_CREDENTIALS', 'x'))).toBe(
      false,
    )
    expect(isAuthError(new ApiError(403, 'FORBIDDEN', 'x'))).toBe(false)
    expect(isAuthError(fromUseApi('FORBIDDEN'))).toBe(false)
    expect(isAuthError({ statusCode: 401 })).toBe(false)
    expect(isAuthError(new Error('No user authentication found'))).toBe(false)
  })

  it('extracts the message', () => {
    expect(extractMessage(new ApiError(403, 'FORBIDDEN', 'x'))).toBe('x')
    expect(extractMessage(fromUseApi('FORBIDDEN'))).toBe('x')
    expect(extractMessage(new Error('plain'))).toBe('plain')
    expect(extractMessage(42)).toBe('Unknown Error.')
  })
})
