import { beforeEach, describe, expect, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { insertUser, signup } from '../utils/auth'
import { resetFakes, resetLinkIn, sentMail } from '../utils/fakes'

const NEW_PASSWORD = 'NewPassw0rd!'
const EXPIRED = 'Session expired, please log in again'

/** Resets this email's password through the emailed link; returns the user id. */
const resetPassword = async (email: string): Promise<string> => {
  const res = await api('POST', '/api/token/send-token', { body: { email } })
  expect(res.status).toBe(200)
  const link = resetLinkIn((await sentMail()).at(-1)!.text)
  const userId = link.searchParams.get('user')!
  const reset = await api('POST', '/api/token/reset-password', {
    body: {
      userId,
      token: link.searchParams.get('token'),
      password: NEW_PASSWORD,
    },
  })
  expect(reset.status).toBe(200)
  return userId
}

const me = (token: string) => api('GET', '/api/auth', { token })

beforeEach(resetFakes)

describe('session tokens and password changes', () => {
  it('a token without a version still works', async () => {
    const { token } = await insertUser()
    expect((await me(token)).status).toBe(200)
  })

  it('a reset logs out a token issued before it', async () => {
    const u = await signup()
    await resetPassword(u.email)
    expectApiError(await me(u.token), 'UNAUTHENTICATED', EXPIRED)
    const login = await api('POST', '/api/auth', {
      body: { email: u.email, password: NEW_PASSWORD },
    })
    expect(login.status).toBe(200)
    expect((await me(login.json.data.accessToken)).status).toBe(200)
  })

  it('a reset also logs out an old-format token', async () => {
    const { email, token } = await insertUser()
    await resetPassword(email)
    expectApiError(await me(token), 'UNAUTHENTICATED', EXPIRED)
  })

  it('a settings password change keeps other sessions', async () => {
    const u = await signup()
    const login = await api('POST', '/api/auth', {
      body: { email: u.email, password: u.password },
    })
    const tokenB = login.json.data.accessToken
    const change = await api('PUT', '/api/user/user-info/password', {
      token: tokenB,
      body: { currentPassword: u.password, newPassword: NEW_PASSWORD },
    })
    expect(change.status).toBe(200)
    expect((await me(u.token)).status).toBe(200)
  })

  it('no response exposes tokenVersion or password', async () => {
    const u = await signup()
    await resetPassword(u.email)
    const login = await api('POST', '/api/auth', {
      body: { email: u.email, password: NEW_PASSWORD },
    })
    const mine = await me(login.json.data.accessToken)
    expect(mine.status).toBe(200)
    expect(mine.json.data).not.toHaveProperty('tokenVersion')
    expect(mine.json.data).not.toHaveProperty('password')
    const admin = await insertUser('ADMIN')
    const list = await api('GET', '/api/user/admin', { token: admin.token })
    expect(list.status).toBe(200)
    expect(list.json.data.length).toBeGreaterThan(0)
    for (const user of list.json.data) {
      expect(user).not.toHaveProperty('tokenVersion')
      expect(user).not.toHaveProperty('password')
    }
  })
})
