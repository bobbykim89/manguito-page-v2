import { createHash } from 'node:crypto'
import mongoose from 'mongoose'
import { beforeEach, describe, expect, inject, it } from 'vitest'
import { api } from '../utils/api'
import { insertUser } from '../utils/auth'
import { db } from '../utils/db'
import { resetFakes, resetLinkIn, sentMail } from '../utils/fakes'

const GENERIC = "If that email has an account, we've sent a reset link."

const requestReset = (email: string, headers?: Record<string, string>) =>
  api('POST', '/api/token/send-token', {
    // the url is ignored: the link must come from the server's own origin
    body: { email, url: 'https://evil.example' },
    headers,
  })

/** Requests a reset and returns the emailed link. */
const emailedLink = async (
  email: string,
  headers?: Record<string, string>,
): Promise<URL> => {
  const before = (await sentMail()).length
  const res = await requestReset(email, headers)
  expect(res.status).toBe(200)
  const mail = await sentMail()
  expect(mail).toHaveLength(before + 1)
  return resetLinkIn(mail.at(-1)!.text)
}

const storedTokens = async (userId: string) => {
  const conn = await db()
  return conn.connection
    .collection('tokens')
    .find({ userId: new mongoose.Types.ObjectId(userId) })
    .toArray()
}

const resetWith = (userId: string, token: string) =>
  api('POST', '/api/token/reset-password', {
    body: { userId, token, password: 'NewPassw0rd!' },
  })

beforeEach(resetFakes)

describe('POST /api/token/send-token', () => {
  it('links to the server it was requested from, not the url in the body', async () => {
    const { email } = await insertUser()
    const link = await emailedLink(email)
    expect(link.origin).toBe(inject('baseUrl'))
  })

  it('ignores X-Forwarded-Host', async () => {
    const { email } = await insertUser()
    const link = await emailedLink(email, {
      'x-forwarded-host': 'evil.example',
    })
    expect(link.host).toBe(new URL(inject('baseUrl')).host)
  })

  it('uses https behind an https proxy', async () => {
    const { email } = await insertUser()
    const link = await emailedLink(email, { 'x-forwarded-proto': 'https' })
    expect(link.protocol).toBe('https:')
  })

  it('answers the same for an unknown email and sends nothing', async () => {
    const { email } = await insertUser()
    const known = await requestReset(email)
    const unknown = await requestReset('nobody@example.test')
    expect(unknown.status).toBe(known.status)
    expect(JSON.stringify(unknown.json)).toBe(JSON.stringify(known.json))
    expect(JSON.stringify(known.json)).toContain(GENERIC)
    const mail = await sentMail()
    expect(mail).toHaveLength(1)
    expect(mail[0]!.to).toBe(email)
  })

  it('stores only a digest of the emailed token', async () => {
    const { id, email } = await insertUser()
    const link = await emailedLink(email)
    const linkToken = link.searchParams.get('token')!
    expect(linkToken).toMatch(/^[0-9a-f]{64}$/)
    expect(link.searchParams.get('user')).toBe(id)
    const stored = await storedTokens(id)
    expect(stored).toHaveLength(1)
    expect(stored[0]!.token).not.toBe(linkToken)
    expect(stored[0]!.token).toBe(
      createHash('sha256').update(linkToken).digest('hex'),
    )
  })

  it('a new request replaces the old link', async () => {
    const { id, email } = await insertUser()
    const first = (await emailedLink(email)).searchParams.get('token')!
    const second = (await emailedLink(email)).searchParams.get('token')!
    expect(await storedTokens(id)).toHaveLength(1)
    expect((await resetWith(id, first)).status).toBe(400)
    expect((await resetWith(id, second)).status).toBe(200)
  })
})

describe('POST /api/token/reset-password', () => {
  it('resets the password once with the emailed token', async () => {
    const { id, email } = await insertUser()
    const token = (await emailedLink(email)).searchParams.get('token')!
    const conn = await db()
    const users = conn.connection.collection('users')
    const _id = new mongoose.Types.ObjectId(id)
    const before = (await users.findOne({ _id }))!.password

    expect((await resetWith(id, token)).status).toBe(200)
    expect((await users.findOne({ _id }))!.password).not.toBe(before)
    expect(await storedTokens(id)).toHaveLength(0)
    expect((await resetWith(id, token)).status).toBe(400)
  })

  it('rejects the stored value as a token', async () => {
    const { id, email } = await insertUser()
    await emailedLink(email)
    const stored = (await storedTokens(id))[0]!.token as string
    expect((await resetWith(id, stored)).status).toBe(400)
  })
})
