import { describe, expect, it } from 'vitest'
import { api } from '../utils/api'
import { insertUser } from '../utils/auth'
import { resetFakes, sentMail } from '../utils/fakes'

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
})
