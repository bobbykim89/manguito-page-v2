import mongoose from 'mongoose'
import { describe, expect, it } from 'vitest'
import { deleteUser, insertUser } from '../utils/auth'
import { db } from '../utils/db'
import { page } from '../utils/page'

const staleToken = async () => {
  const { id, token } = await insertUser('ADMIN')
  await deleteUser(id)
  return token
}

describe('route guards on first load', () => {
  it.each(['/admin', '/admin/request'])(
    'sends a stale session on %s to login with reason=expired',
    async (path) => {
      const res = await page(path, await staleToken())
      expect(res.status).toBe(302)
      expect(res.location).toBe('/auth/login?reason=expired')
    },
  )

  it('logs a stale session out quietly on a public page', async () => {
    const res = await page('/', await staleToken())
    expect(res.status).toBe(200)
    expect(res.html).not.toContain('User not found')
    expect(res.html).not.toContain('Session expired')
    expect(res.setCookie).toContain('access_token=;')
  })

  it('sends a visitor with no session away from /admin', async () => {
    const res = await page('/admin')
    expect(res.status).toBe(302)
    expect(res.location).toBe('/')
  })

  it('keeps a USER out of /admin but lets them use /admin/request', async () => {
    const { token } = await insertUser('USER')
    const admin = await page('/admin', token)
    expect(admin.status).toBe(302)
    expect(admin.location).toBe('/')
    const request = await page('/admin/request', token)
    expect(request.status).toBe(200)
  })

  it('keeps a MANAGER out of /admin', async () => {
    const { token } = await insertUser('MANAGER')
    const res = await page('/admin', token)
    expect(res.status).toBe(302)
    expect(res.location).toBe('/')
  })

  it('lets an ADMIN into /admin', async () => {
    const { token } = await insertUser('ADMIN')
    const res = await page('/admin', token)
    expect(res.status).toBe(200)
  })

  it('sends a logged-in user away from /auth/login', async () => {
    const { token } = await insertUser('USER')
    const res = await page('/auth/login', token)
    expect(res.status).toBe(302)
    expect(res.location).toBe('/')
  })

  it('still server-renders posts', async () => {
    const { id } = await insertUser('ADMIN')
    const conn = await db()
    const posts = conn.connection.collection('posts')
    const inserted = await posts.insertOne({
      content: 'hello manguito',
      imageId: 'test/manguito-image',
      author: new mongoose.Types.ObjectId(id),
      date: new Date(),
      updatedAt: new Date(),
    })
    try {
      const res = await page('/posts')
      expect(res.status).toBe(200)
      expect(res.html).toContain('hello manguito')
    } finally {
      await posts.deleteOne({ _id: inserted.insertedId })
    }
  })
})

describe('login page', () => {
  it('explains an expired session', async () => {
    const res = await page('/auth/login?reason=expired')
    expect(res.status).toBe(200)
    expect(res.html).toContain('Your session expired, please log in again.')
    expect(res.html).toContain('role="status"')
  })

  it('says nothing about sessions otherwise', async () => {
    const res = await page('/auth/login')
    expect(res.status).toBe(200)
    expect(res.html).not.toContain('Your session expired')
  })
})
