import { describe, expect, inject, it } from 'vitest'
import { api } from '../utils/api'
import { insertUser } from '../utils/auth'
import { failNext, resetFakes, sentMail } from '../utils/fakes'

describe('API test fakes', () => {
  it('delivers the reset email to the local sink', async () => {
    await resetFakes()
    const { email } = await insertUser()
    const res = await api('POST', '/api/token/send-token', {
      body: { email, url: 'http://localhost' },
    })
    expect(res.status).toBe(200)
    const mail = await sentMail()
    expect(mail).toHaveLength(1)
    expect(mail[0]!.to).toBe(email)
  })

  it('fails the next Cloudinary call only', async () => {
    await resetFakes()
    await failNext('cloudinary')
    const upload = () =>
      fetch(`${inject('fakesUrl')}/v1_1/test/image/upload`, { method: 'POST' })
    expect((await upload()).status).toBe(500)
    expect((await upload()).status).toBe(200)
  })

  it('refuses the next mail only', async () => {
    await resetFakes()
    const { email } = await insertUser()
    await failNext('mail')
    const request = () =>
      api('POST', '/api/token/send-token', { body: { email } })
    expect((await request()).status).not.toBe(200)
    expect((await request()).status).toBe(200)
    expect(await sentMail()).toHaveLength(1)
  })

  it('forgets a pending failure on reset', async () => {
    await failNext('cloudinary')
    await resetFakes()
    const res = await fetch(`${inject('fakesUrl')}/v1_1/test/image/upload`, {
      method: 'POST',
    })
    expect(res.status).toBe(200)
  })
})
