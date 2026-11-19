import { createError } from 'h3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAlertStore, useUserStore } from '@/stores'
import { clearApiMocks, mockApi, resetState } from './helpers'

const liveUser = {
  _id: 'u1',
  name: 'mango',
  email: 'm@example.test',
  role: 'USER',
}

describe('userStore session handling', () => {
  beforeEach(() => {
    resetState()
  })
  afterEach(() => {
    clearApiMocks()
  })

  it('a 401 from /api/auth logs out quietly', async () => {
    useAuthToken().value = 'Bearer stale'
    mockApi('GET', '/api/auth', () => {
      throw createError({
        statusCode: 401,
        statusMessage: 'Session expired, please log in again',
      })
    })
    const user = useUserStore()
    await user.ensureAuth()
    expect(user.isAuthenticated).toBe(false)
    expect(user.currentUser).toBeNull()
    expect(user.sessionExpired).toBe(true)
    expect(useAuthToken().value).toBeFalsy()
    expect(useAlertStore().alertMessage).toBeNull()
  })

  it('a 500 from /api/auth still alerts', async () => {
    useAuthToken().value = 'Bearer something'
    mockApi('GET', '/api/auth', () => {
      throw createError({ statusCode: 500, statusMessage: 'boom' })
    })
    const user = useUserStore()
    await user.ensureAuth()
    expect(useAlertStore().alertMessage).toBe('boom')
    expect(user.sessionExpired).toBe(false)
  })

  it('ensureAuth calls /api/auth once', async () => {
    useAuthToken().value = 'Bearer live'
    let calls = 0
    mockApi('GET', '/api/auth', () => {
      calls += 1
      return liveUser
    })
    const user = useUserStore()
    await Promise.all([user.ensureAuth(), user.ensureAuth()])
    await user.ensureAuth()
    expect(calls).toBe(1)
    expect(user.isAuthenticated).toBe(true)
  })

  it('tells the user when an action they started hits an expired session', async () => {
    useAuthToken().value = 'Bearer stale'
    mockApi('PUT', '/api/user/user-info/username', () => {
      throw createError({
        statusCode: 401,
        statusMessage: 'Session expired, please log in again',
      })
    })
    const user = useUserStore()
    await user.updateUsername({ username: 'new-name' } as never)
    expect(useAlertStore().alertMessage).toBe(
      'Session expired, please log in again',
    )
    expect(user.isAuthenticated).toBe(false)
    expect(user.sessionExpired).toBe(true)
    expect(useAuthToken().value).toBeFalsy()
  })

  it('makes no request without a cookie', async () => {
    let calls = 0
    mockApi('GET', '/api/auth', () => {
      calls += 1
      return liveUser
    })
    const user = useUserStore()
    await user.ensureAuth()
    expect(calls).toBe(0)
    expect(user.sessionExpired).toBe(false)
  })
})
