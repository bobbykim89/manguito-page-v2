import { describe, expect, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { insertUser } from '../utils/auth'
import { clearContent } from '../utils/content'

describe('API envelopes', () => {
  it('wraps a success', async () => {
    await clearContent()
    const res = await api('GET', '/api/post')
    expect(res.status).toBe(200)
    expect(res.json).toEqual({ ok: true, data: [] })
  })

  it('answers an unknown path with a 404 envelope', async () => {
    expectApiError(
      await api('GET', '/api/nope'),
      'NOT_FOUND',
      'No such API route.',
    )
  })

  it('answers a wrong method on a real route with a 404 envelope', async () => {
    expectApiError(
      await api('PATCH', '/api/post'),
      'NOT_FOUND',
      'No such API route.',
    )
  })

  it('lists the invalid fields', async () => {
    const res = await api('POST', '/api/auth', {
      body: { email: 'nope', password: 'x' },
    })
    expectApiError(res, 'VALIDATION_FAILED', 'Some fields are invalid.')
    expect(
      res.json.error.details.map((d: { path: string }) => d.path).sort(),
    ).toEqual(['email', 'password'])
  })

  it('answers a malformed JSON body with a 400 envelope', async () => {
    const res = await api('POST', '/api/auth', {
      raw: '{bad',
      headers: { 'content-type': 'application/json' },
    })
    expectApiError(res, 'VALIDATION_FAILED')
  })

  it('wraps errors thrown by middleware', async () => {
    expectApiError(
      await api('GET', '/api/auth', { token: 'Bearer not-a-jwt' }),
      'UNAUTHENTICATED',
    )
  })

  it('never sends the password hash', async () => {
    const { token } = await insertUser()
    const res = await api('GET', '/api/auth', { token })
    expect(res.json.ok).toBe(true)
    expect(res.json.data).not.toHaveProperty('password')
  })
})
