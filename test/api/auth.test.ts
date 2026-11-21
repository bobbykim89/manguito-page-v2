import { describe, expect, it } from 'vitest'
import { api } from '../utils/api'
import { deleteUser, insertUser } from '../utils/auth'

describe('GET /api/auth', () => {
  it("answers 401 when the token's user no longer exists", async () => {
    const { id, token } = await insertUser()
    await deleteUser(id)
    const res = await api('GET', '/api/auth', { token })
    expect(res.status).toBe(401)
    expect(JSON.stringify(res.json)).toContain(
      'Session expired, please log in again',
    )
  })

  it('returns the user for a live token', async () => {
    const { id, token } = await insertUser()
    const res = await api('GET', '/api/auth', { token })
    expect(res.status).toBe(200)
    expect(res.json.data._id).toBe(id)
  })
})
