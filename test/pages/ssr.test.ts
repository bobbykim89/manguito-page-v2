import mongoose from 'mongoose'
import { describe, expect, it } from 'vitest'
import { insertUser } from '../utils/auth'
import { db } from '../utils/db'
import { page } from '../utils/page'

describe('server-rendered pages', () => {
  it.each([
    ['/', '<title>ManguitoPage</title>'],
    ['/about', 'About | Manguito Page'],
    ['/posts', '<title>'],
  ])('renders %s', async (path, expected) => {
    const res = await page(path)
    expect(res.status).toBe(200)
    expect(res.html).toContain(expected)
    // error.vue uses this title for every error, whatever the status
    expect(res.html).not.toContain('404 | Manguito Page')
  })
})

describe('post page', () => {
  const notFound = /This page doesn(?:'|&#39;)t exist/

  it('answers 404 for a malformed post id', async () => {
    const res = await page('/posts/not-an-id')
    expect(res.status).toBe(404)
    expect(res.html).toMatch(notFound)
  })

  it('answers 404 for an unknown post id', async () => {
    const res = await page(`/posts/${new mongoose.Types.ObjectId().toString()}`)
    expect(res.status).toBe(404)
    expect(res.html).toMatch(notFound)
  })

  it('server-renders a post', async () => {
    const { id } = await insertUser('MANAGER')
    const conn = await db()
    const posts = conn.connection.collection('posts')
    const inserted = await posts.insertOne({
      content: 'a server-rendered caption',
      imageId: 'test/manguito-image',
      author: new mongoose.Types.ObjectId(id),
      date: new Date(),
      updatedAt: new Date(),
    })
    try {
      const res = await page(`/posts/${inserted.insertedId.toString()}`)
      expect(res.status).toBe(200)
      expect(res.html).toContain('a server-rendered caption')
    } finally {
      await posts.deleteOne({ _id: inserted.insertedId })
    }
  })
})

describe('error page', () => {
  it('shows a 404 for an unknown route', async () => {
    const res = await page('/does-not-exist')
    expect(res.status).toBe(404)
    // Vue escapes the apostrophe in server-rendered text
    expect(res.html).toMatch(/This page doesn(?:'|&#39;)t exist/)
    expect(res.html).toContain('<title>404 | Manguito Page')
  })
})

describe('form labels', () => {
  it.each([
    ['/auth/login', ['login-email', 'login-pw']],
    ['/auth/signup', ['signup-name', 'signup-email', 'signup-pw']],
  ])('ties each label on %s to its input', async (path, ids) => {
    const res = await page(path)
    for (const id of ids) {
      expect(res.html).toMatch(new RegExp(`<label[^>]*for="${id}"`))
      expect(res.html).toMatch(new RegExp(`<input[^>]*id="${id}"`))
    }
  })
})
