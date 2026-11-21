import { describe, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { deleteUser, insertUser, signup } from '../utils/auth'

const LOGIN_FAILED = 'Invalid credential: please check email or password again'

describe('not authenticated: 401 UNAUTHENTICATED', () => {
  it('without a token', async () => {
    expectApiError(
      await api('GET', '/api/auth'),
      'UNAUTHENTICATED',
      'No access token found, please log in.',
    )
  })

  it('with a token that is not a valid JWT', async () => {
    expectApiError(
      await api('GET', '/api/auth', { token: 'Bearer not-a-jwt' }),
      'UNAUTHENTICATED',
      'Access token is not valid, please log in again.',
    )
  })

  it('with a token whose user no longer exists', async () => {
    const { id, token } = await insertUser()
    await deleteUser(id)
    expectApiError(
      await api('GET', '/api/auth', { token }),
      'UNAUTHENTICATED',
      'Session expired, please log in again',
    )
  })
})

describe('wrong credentials: 401 INVALID_CREDENTIALS', () => {
  it('logging in with an unknown email', async () => {
    const res = await api('POST', '/api/auth', {
      body: { email: 'nobody@example.test', password: 'Passw0rd!' },
    })
    expectApiError(res, 'INVALID_CREDENTIALS', LOGIN_FAILED)
  })

  it('logging in with the wrong password', async () => {
    const u = await signup()
    const res = await api('POST', '/api/auth', {
      body: { email: u.email, password: 'WrongPass1!' },
    })
    expectApiError(res, 'INVALID_CREDENTIALS', LOGIN_FAILED)
  })

  it('changing the password with the wrong current one', async () => {
    const u = await signup()
    const res = await api('PUT', '/api/user/user-info/password', {
      token: u.token,
      body: { currentPassword: 'WrongPass1!', newPassword: 'N3wPassw0rd!' },
    })
    expectApiError(
      res,
      'INVALID_CREDENTIALS',
      'Invalid credential: please check your password again',
    )
  })
})

describe('not allowed: 403 FORBIDDEN', () => {
  it('a USER listing users', async () => {
    const { token } = await insertUser('USER')
    expectApiError(await api('GET', '/api/user/admin', { token }), 'FORBIDDEN')
  })

  it('a MANAGER setting a role', async () => {
    const manager = await insertUser('MANAGER')
    const target = await insertUser('USER')
    const res = await api('PUT', `/api/user/admin/${target.id}`, {
      token: manager.token,
      body: { role: 'MANAGER' },
    })
    expectApiError(res, 'FORBIDDEN')
  })

  it('becoming admin with the wrong phrase', async () => {
    const { token } = await insertUser('USER')
    const res = await api('PUT', '/api/user/admin', {
      token,
      body: { phrase: 'wrong' },
    })
    expectApiError(res, 'FORBIDDEN', 'Access denied.')
  })

  it('becoming admin when an admin exists', async () => {
    await insertUser('ADMIN')
    const { token } = await insertUser('USER')
    const res = await api('PUT', '/api/user/admin', {
      token,
      body: { phrase: 'test-admin-phrase' },
    })
    expectApiError(res, 'FORBIDDEN', 'Access denied: admin already exists.')
  })
})
