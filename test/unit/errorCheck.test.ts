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

  it('hides a raw fetch message when there is no envelope', () => {
    const proxied = Object.assign(
      new Error('[GET] "/api/post": 504 Gateway Timeout'),
      { statusCode: 504, data: '<html>Gateway</html>' },
    )
    expect(extractMessage(proxied)).toBe(
      'Could not reach the server, please try again.',
    )
  })

  it("shows the one invalid field's message", () => {
    const one = [{ path: 'text', message: 'Please write a comment.' }]
    const two = [...one, { path: 'name', message: 'Please enter a username.' }]
    const generic = 'Some fields are invalid.'
    expect(
      extractMessage(new ApiError(400, 'VALIDATION_FAILED', generic, one)),
    ).toBe('Please write a comment.')
    expect(
      extractMessage(new ApiError(400, 'VALIDATION_FAILED', generic, two)),
    ).toBe(generic)
    expect(
      extractMessage({
        data: {
          ok: false,
          error: { code: 'VALIDATION_FAILED', message: generic, details: one },
        },
      }),
    ).toBe('Please write a comment.')
  })
})
