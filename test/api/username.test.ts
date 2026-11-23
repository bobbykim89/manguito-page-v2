import { describe, expect, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { signup } from '../utils/auth'

const rename = (token: string, username: string) =>
  api('PUT', '/api/user/user-info/username', { token, body: { username } })

describe('PUT /api/user/user-info/username', () => {
  it('renaming yourself to your current name succeeds unchanged', async () => {
    const u = await signup()
    const res = await rename(u.token, u.name)
    expect(res.status).toBe(200)
    expect(res.json.data.name).toBe(u.name)
  })

  it("renaming to someone else's name still conflicts", async () => {
    const a = await signup()
    const b = await signup()
    expectApiError(await rename(a.token, b.name), 'CONFLICT')
  })
})
