import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAlertStore, useUserStore } from '@/stores'
import {
  clearApiMocks,
  failEnvelope,
  mockApi,
  okEnvelope,
  resetState,
} from './helpers'

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
    mockApi('GET', '/api/auth', (e) =>
      failEnvelope(
        e,
        'UNAUTHENTICATED',
        'Session expired, please log in again',
      ),
    )
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
    mockApi('GET', '/api/auth', (e) => failEnvelope(e, 'INTERNAL', 'boom'))
    const user = useUserStore()
    await user.ensureAuth()
    expect(useAlertStore().alertMessage).toBe('boom')
    expect(user.sessionExpired).toBe(false)
    // only UNAUTHENTICATED ends the session
    expect(useAuthToken().value).toBe('Bearer something')
  })

  it('ensureAuth calls /api/auth once', async () => {
    useAuthToken().value = 'Bearer live'
    let calls = 0
    mockApi('GET', '/api/auth', () => {
      calls += 1
      return okEnvelope(liveUser)
    })
    const user = useUserStore()
    await Promise.all([user.ensureAuth(), user.ensureAuth()])
    await user.ensureAuth()
    expect(calls).toBe(1)
    expect(user.isAuthenticated).toBe(true)
  })

  it('tells the user when an action they started hits an expired session', async () => {
    useAuthToken().value = 'Bearer stale'
    mockApi('PUT', '/api/user/user-info/username', (e) =>
      failEnvelope(
        e,
        'UNAUTHENTICATED',
        'Session expired, please log in again',
      ),
    )
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
      return okEnvelope(liveUser)
    })
    const user = useUserStore()
    await user.ensureAuth()
    expect(calls).toBe(0)
    expect(user.sessionExpired).toBe(false)
  })

  it('a wrong login only alerts', async () => {
    useAuthToken().value = 'Bearer keep'
    mockApi('POST', '/api/auth', (e) =>
      failEnvelope(
        e,
        'INVALID_CREDENTIALS',
        'Invalid credential: please check email or password again',
      ),
    )
    const user = useUserStore()
    await user.loginWithCredential({
      email: 'm@example.test',
      password: 'WrongPass1!',
    })
    expect(useAlertStore().alertMessage).toBe(
      'Invalid credential: please check email or password again',
    )
    expect(user.sessionExpired).toBe(false)
    expect(useAuthToken().value).toBe('Bearer keep')
  })

  it('a refusal keeps the user logged in', async () => {
    useAuthToken().value = 'Bearer live'
    mockApi('PUT', '/api/user/admin', (e) =>
      failEnvelope(e, 'FORBIDDEN', 'Access denied.'),
    )
    const user = useUserStore()
    user.$patch({ currentUser: liveUser as never })
    await user.setAdmin({ phrase: 'wrong' })
    expect(useAlertStore().alertMessage).toBe('Access denied.')
    expect(user.isAuthenticated).toBe(true)
    expect(user.sessionExpired).toBe(false)
    expect(useAuthToken().value).toBe('Bearer live')
  })

  it("a 401 without a cookie alerts but doesn't mark the session expired", async () => {
    mockApi('PUT', '/api/user/user-info/username', (e) =>
      failEnvelope(
        e,
        'UNAUTHENTICATED',
        'No access token found, please log in.',
      ),
    )
    const user = useUserStore()
    await user.updateUsername({ username: 'new-name' })
    expect(useAlertStore().alertMessage).toBe(
      'No access token found, please log in.',
    )
    expect(user.sessionExpired).toBe(false)
  })

  it('logout clears an earlier expired flag', () => {
    useAuthToken().value = 'Bearer live'
    const user = useUserStore()
    user.$patch({ currentUser: liveUser as never })
    user.expireSession()
    expect(user.sessionExpired).toBe(true)
    user.logoutUser()
    expect(user.sessionExpired).toBe(false)
    expect(useAlertStore().alertMessage).toBe('Logout successful!')
  })

  it('login clears an earlier expired flag', async () => {
    mockApi('POST', '/api/auth', () =>
      okEnvelope({ accessToken: 'Bearer new' }),
    )
    mockApi('GET', '/api/auth', () => okEnvelope(liveUser))
    const user = useUserStore()
    user.$patch({ sessionExpired: true })
    await user.loginWithCredential({
      email: 'm@example.test',
      password: 'Passw0rd!',
    })
    expect(user.sessionExpired).toBe(false)
    expect(user.isAuthenticated).toBe(true)
    expect(useAlertStore().alertMessage).toBe('Login Successful!')
  })

  it('updateUsername uses the response, with no second call', async () => {
    useAuthToken().value = 'Bearer live'
    let gets = 0
    mockApi('GET', '/api/auth', () => {
      gets += 1
      return okEnvelope(liveUser)
    })
    mockApi('PUT', '/api/user/user-info/username', () =>
      okEnvelope({ ...liveUser, name: 'new' }),
    )
    const user = useUserStore()
    user.$patch({ currentUser: liveUser as never })
    await user.updateUsername({ username: 'new' })
    expect(user.currentUser?.name).toBe('new')
    expect(gets).toBe(0)
    expect(useAlertStore().alertMessage).toBe('Successfully updated username')
  })

  it('setAdmin sets the user from the response', async () => {
    useAuthToken().value = 'Bearer live'
    mockApi('PUT', '/api/user/admin', () =>
      okEnvelope({ ...liveUser, role: 'ADMIN' }),
    )
    const user = useUserStore()
    user.$patch({ currentUser: liveUser as never })
    await user.setAdmin({ phrase: 'right' })
    expect(user.isAdmin).toBe(true)
    expect(useAlertStore().alertMessage).toBe(
      'Successfully set user as an admin!',
    )
  })

  it('getters follow currentUser', () => {
    const user = useUserStore()
    expect(user.isAuthenticated).toBe(false)
    expect(user.role).toBeNull()
    user.$patch({ currentUser: { ...liveUser, role: 'MANAGER' } as never })
    expect(user.isAuthenticated).toBe(true)
    expect(user.role).toBe('MANAGER')
    expect(user.isManagerOrUp).toBe(true)
    expect(user.isAdmin).toBe(false)
  })

  it('expireSession logs out and marks the session expired', () => {
    useAuthToken().value = 'Bearer live'
    const user = useUserStore()
    user.$patch({ currentUser: liveUser as never })
    user.expireSession()
    expect(user.isAuthenticated).toBe(false)
    expect(user.currentUser).toBeNull()
    expect(user.role).toBeNull()
    expect(user.sessionExpired).toBe(true)
    expect(useAuthToken().value).toBeFalsy()
  })
})
