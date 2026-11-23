import { createHash } from 'node:crypto'
import mongoose from 'mongoose'
import { beforeEach, describe, expect, inject, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { insertUser } from '../utils/auth'
import { db } from '../utils/db'
import { resetFakes, resetLinkIn, sentMail } from '../utils/fakes'

const GENERIC = "If that email has an account, we've sent a reset link."
const RESET_LINK = 'This reset link is invalid or has expired.'

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
    expect(known.json).toEqual({ ok: true, data: { message: GENERIC } })
    expect(unknown.json).toEqual(known.json)
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
    expectApiError(await resetWith(id, first), 'VALIDATION_FAILED', RESET_LINK)
    expect((await resetWith(id, second)).status).toBe(200)
  })

  it('two reset requests at once leave one token', async () => {
    const { id, email } = await insertUser()
    const before = (await sentMail()).length
    const answers = await Promise.all([
      requestReset(email),
      requestReset(email),
    ])
    expect(answers.map((r) => r.status)).toEqual([200, 200])
    expect(await storedTokens(id)).toHaveLength(1)
    const mail = await sentMail()
    expect(mail).toHaveLength(before + 2)
    const tokens = mail
      .slice(-2)
      .map((m) => resetLinkIn(m.text).searchParams.get('token')!)
    const statuses = []
    for (const token of tokens)
      statuses.push((await resetWith(id, token)).status)
    expect(statuses.sort()).toEqual([200, 400])
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

    const res = await resetWith(id, token)
    expect(res.status).toBe(200)
    expect(res.json).toEqual({ ok: true, data: null })
    expect((await users.findOne({ _id }))!.password).not.toBe(before)
    expect(await storedTokens(id)).toHaveLength(0)
    expectApiError(await resetWith(id, token), 'VALIDATION_FAILED', RESET_LINK)
  })

  it('a reset link works once even when used twice at once', async () => {
    const { id, email } = await insertUser()
    const token = (await emailedLink(email)).searchParams.get('token')!
    const answers = await Promise.all([
      resetWith(id, token),
      resetWith(id, token),
    ])
    expect(answers.map((r) => r.status).sort()).toEqual([200, 400])
    const refused = answers.find((r) => r.status === 400)!
    expectApiError(refused, 'VALIDATION_FAILED', RESET_LINK)
  })

  it('rejects the stored value as a token', async () => {
    const { id, email } = await insertUser()
    await emailedLink(email)
    const stored = (await storedTokens(id))[0]!.token as string
    expectApiError(await resetWith(id, stored), 'VALIDATION_FAILED', RESET_LINK)
  })

  it('answers the same for a user id with no account', async () => {
    const res = await resetWith(
      new mongoose.Types.ObjectId().toString(),
      'a'.repeat(64),
    )
    expectApiError(res, 'VALIDATION_FAILED', RESET_LINK)
  })
})
