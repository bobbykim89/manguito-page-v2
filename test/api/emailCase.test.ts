import { beforeEach, describe, expect, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { db } from '../utils/db'
import { resetFakes, sentMail } from '../utils/fakes'

const n = Date.now()
const typed = ` Mixed-${n}@Example.Test `
const stored = `mixed-${n}@example.test`
const shouted = stored.toUpperCase()

beforeEach(resetFakes)

describe('emails ignore case and surrounding spaces', () => {
  it('stores a signup email trimmed and lowercased', async () => {
    const res = await api('POST', '/api/user', {
      body: { name: `mixed-${n}`, email: typed, password: 'Passw0rd!' },
    })
    expect(res.status).toBe(201)
    const user = await (
      await db()
    ).connection
      .collection('users')
      .findOne({ name: `mixed-${n}` })
    expect(user?.email).toBe(stored)
  })

  it('logs in with a differently-cased email', async () => {
    const res = await api('POST', '/api/auth', {
      body: { email: shouted, password: 'Passw0rd!' },
    })
    expect(res.status).toBe(200)
    expect(res.json.data.accessToken).toMatch(/^Bearer /)
  })

  it('refuses a signup whose email differs only by case', async () => {
    const res = await api('POST', '/api/user', {
      body: { name: `other-${n}`, email: shouted, password: 'Passw0rd!' },
    })
    expectApiError(
      res,
      'CONFLICT',
      'That email address is already in use, please use a different one.',
    )
  })

  it('sends a reset link to a differently-cased email', async () => {
    const before = (await sentMail()).length
    const res = await api('POST', '/api/token/send-token', {
      body: { email: `MIXED-${n}@example.TEST` },
    })
    expect(res.status).toBe(200)
    expect(await sentMail()).toHaveLength(before + 1)
  })
})
