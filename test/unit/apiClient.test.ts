import { getRequestHeader } from 'h3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ApiError, toApiError } from '@/utils/apiError'
import {
  clearApiMocks,
  failEnvelope,
  mockApi,
  okEnvelope,
  resetState,
} from './helpers'

describe('$api', () => {
  beforeEach(resetState)
  afterEach(clearApiMocks)

  it('unwraps data', async () => {
    mockApi('GET', '/api/thing', () => okEnvelope({ n: 1 }))
    expect(await useNuxtApp().$api('/api/thing')).toEqual({ n: 1 })
  })

  it('sends the session token', async () => {
    useAuthToken().value = 'Bearer abc'
    let auth: string | undefined
    mockApi('GET', '/api/thing', (e) => {
      auth = getRequestHeader(e, 'authorization')
      return okEnvelope(null)
    })
    await useNuxtApp().$api('/api/thing')
    expect(auth).toBe('Bearer abc')
  })

  it('sends no token without a session', async () => {
    let auth: string | undefined = 'unset'
    mockApi('GET', '/api/thing', (e) => {
      auth = getRequestHeader(e, 'authorization')
      return okEnvelope(null)
    })
    await useNuxtApp().$api('/api/thing')
    expect(auth).toBeUndefined()
  })

  it('throws an ApiError from the envelope', async () => {
    mockApi('GET', '/api/thing', (e) =>
      failEnvelope(e, 'FORBIDDEN', 'Access denied.'),
    )
    const err = await useNuxtApp()
      .$api('/api/thing')
      .catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    const apiErr = err as ApiError
    expect([apiErr.status, apiErr.code, apiErr.message]).toEqual([
      403,
      'FORBIDDEN',
      'Access denied.',
    ])
  })

  it('keeps the details of a validation failure', async () => {
    const details = [{ path: 'email', message: 'Invalid email address' }]
    mockApi('POST', '/api/thing', (e) =>
      failEnvelope(e, 'VALIDATION_FAILED', 'Some fields are invalid.', details),
    )
    const err = (await useNuxtApp()
      .$api('/api/thing', { method: 'POST' })
      .catch((e: unknown) => e)) as ApiError
    expect(err.details).toEqual(details)
  })

  it('treats a response without an envelope as unreachable', () => {
    const html = Object.assign(new Error('504'), {
      status: 504,
      data: '<html>Gateway</html>',
    })
    expect(toApiError(html)).toMatchObject({
      code: 'INTERNAL',
      message: 'Could not reach the server, please try again.',
    })
    expect(toApiError(new TypeError('fetch failed'))).toMatchObject({
      status: 0,
      code: 'INTERNAL',
    })
  })

  it('useApi gives the unwrapped data', async () => {
    mockApi('GET', '/api/list', () => okEnvelope([1, 2]))
    const { data } = await useApi<number[]>('/api/list')
    expect(data.value).toEqual([1, 2])
  })

  it('useApi keeps the envelope on its error', async () => {
    mockApi('GET', '/api/list', (e) =>
      failEnvelope(e, 'NOT_FOUND', 'Post not found'),
    )
    const { error } = await useApi<number[]>('/api/list', { key: 'list-err' })
    expect(error.value?.data).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Post not found' },
    })
  })

  it('a per-call onResponse still gets unwrapped data', async () => {
    mockApi('GET', '/api/thing', () => okEnvelope({ n: 1 }))
    let called = false
    const res = await useNuxtApp().$api('/api/thing', {
      onResponse: () => {
        called = true
      },
    })
    expect(res).toEqual({ n: 1 })
    expect(called).toBe(true)
  })

  it('a per-call onRequest still sends the token', async () => {
    useAuthToken().value = 'Bearer abc'
    let auth: string | undefined
    mockApi('GET', '/api/thing', (e) => {
      auth = getRequestHeader(e, 'authorization')
      return okEnvelope(null)
    })
    await useNuxtApp().$api('/api/thing', { onRequest: () => {} })
    expect(auth).toBe('Bearer abc')
  })

  it('keeps the real status of a response without an envelope', () => {
    const html = Object.assign(new Error('504'), {
      status: 504,
      data: '<html>Gateway</html>',
    })
    expect(toApiError(html)).toMatchObject({ status: 504, code: 'INTERNAL' })
  })

  it('two useApi call sites for one URL fetch separately', async () => {
    let calls = 0
    mockApi('GET', '/api/shared', () => okEnvelope(++calls))
    const first = await useApi<number>('/api/shared')
    const second = await useApi<number>('/api/shared')
    expect(calls).toBe(2)
    expect([first.data.value, second.data.value]).toEqual([1, 2])
  })
})
