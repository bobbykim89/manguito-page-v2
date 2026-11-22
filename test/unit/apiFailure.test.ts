import type { ApiErrorCode } from '#shared/types'
import { API_ERROR_STATUS } from '#shared/types'
import { createError } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { apiError, toApiFailure } from '../../server/utils/apiError.util'

const failure = (err: unknown) => toApiFailure(err)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('toApiFailure', () => {
  it('keeps an apiError as is', () => {
    expect(failure(apiError('FORBIDDEN', 'Access denied.'))).toEqual({
      status: 403,
      body: {
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Access denied.' },
      },
    })
  })

  it('leaves details out when an apiError has none', () => {
    const { body } = failure(apiError('NOT_FOUND', 'Post not found'))
    expect('details' in body.error).toBe(false)
  })

  it('keeps the details of an apiError', () => {
    const details = [{ path: 'email', message: 'Invalid email address' }]
    expect(
      failure(
        apiError('VALIDATION_FAILED', 'Some fields are invalid.', details),
      ).body.error.details,
    ).toEqual(details)
  })

  it('turns a Zod validation error into details', () => {
    const zod = z
      .object({ email: z.email({ message: 'Invalid email address' }) })
      .safeParse({ email: 'x' }).error
    const err = createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      data: zod,
    })
    expect(failure(err)).toEqual({
      status: 400,
      body: {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Some fields are invalid.',
          details: [{ path: 'email', message: 'Invalid email address' }],
        },
      },
    })
  })

  it('maps a Mongoose ValidationError to invalid fields, not a bad id', () => {
    const err = Object.assign(new Error('Post validation failed: content'), {
      name: 'ValidationError',
    })
    expect(failure(err).body.error).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Some fields are invalid.',
    })
  })

  it.each(['CastError', 'BSONError'])('maps a %s to a bad id', (name) => {
    expect(
      failure(
        Object.assign(new Error('Cast to ObjectId failed for "x"'), { name }),
      ).body.error,
    ).toEqual({ code: 'VALIDATION_FAILED', message: 'That id is not valid.' })
  })

  it('maps a duplicate key to CONFLICT', () => {
    const r = failure(
      Object.assign(new Error('E11000 duplicate key users.email'), {
        code: 11000,
      }),
    )
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('CONFLICT')
    expect(r.body.error.message).not.toContain('E11000')
  })

  it.each([
    [400, 'VALIDATION_FAILED'],
    [401, 'UNAUTHENTICATED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [413, 'UNSUPPORTED_MEDIA_TYPE'],
    [415, 'UNSUPPORTED_MEDIA_TYPE'],
    [422, 'VALIDATION_FAILED'],
  ])('maps an H3 %i to %s with its statusMessage', (statusCode, code) => {
    const r = failure(createError({ statusCode, statusMessage: 'Nope' }))
    expect(r.body.error).toEqual({ code, message: 'Nope' })
    expect(r.status).toBe(API_ERROR_STATUS[code as ApiErrorCode])
  })

  it('replaces a bare reason phrase with a sentence', () => {
    expect(
      failure(createError({ statusCode: 400, statusMessage: 'Bad Request' }))
        .body.error,
    ).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'The request could not be read.',
    })
  })

  it('hides anything else behind INTERNAL and logs it', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = failure(new Error('MongoServerError: secret at /srv/app.js:1'))
    expect(r).toEqual({
      status: 500,
      body: {
        ok: false,
        error: {
          code: 'INTERNAL',
          message: 'Something went wrong, please try again.',
        },
      },
    })
    expect(log).toHaveBeenCalled()
  })

  it('hides an H3 5xx too', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(
      failure(
        createError({ statusCode: 500, statusMessage: 'Failed: ECONNREFUSED' }),
      ).body.error.message,
    ).toBe('Something went wrong, please try again.')
  })
})
