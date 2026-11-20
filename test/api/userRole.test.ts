import mongoose from 'mongoose'
import { describe, expect, it } from 'vitest'
import { api } from '../utils/api'
import { insertUser } from '../utils/auth'
import { db } from '../utils/db'

const storedRole = async (id: string) => {
  const conn = await db()
  const user = await conn.connection
    .collection('users')
    .findOne({ _id: new mongoose.Types.ObjectId(id) })
  return user!.role
}

describe('PUT /api/user/admin/:id', () => {
  it('rejects a role that only contains USER', async () => {
    const admin = await insertUser('ADMIN')
    const target = await insertUser('USER')
    const res = await api('PUT', `/api/user/admin/${target.id}`, {
      token: admin.token,
      body: { role: 'SUPERUSER' },
    })
    expect(res.status).toBe(400)
    expect(await storedRole(target.id)).toBe('USER')
  })

  it('sets MANAGER', async () => {
    const admin = await insertUser('ADMIN')
    const target = await insertUser('USER')
    const res = await api('PUT', `/api/user/admin/${target.id}`, {
      token: admin.token,
      body: { role: 'MANAGER' },
    })
    expect(res.status).toBe(200)
    expect(await storedRole(target.id)).toBe('MANAGER')
  })
})
