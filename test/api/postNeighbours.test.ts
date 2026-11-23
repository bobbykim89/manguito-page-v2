import mongoose from 'mongoose'
import { beforeEach, describe, expect, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { insertUser } from '../utils/auth'
import { clearContent, insertPosts } from '../utils/content'

beforeEach(clearContent)

const author = async () => (await insertUser('MANAGER')).id

describe('GET /api/post/:id', () => {
  it('returns the post with its neighbours', async () => {
    const [a, b, c] = await insertPosts(await author(), 3)
    const res = await api('GET', `/api/post/${b}`)
    expect(res.status).toBe(200)
    expect(res.json.data.post._id).toBe(b)
    expect(res.json.data.prevId).toBe(a)
    expect(res.json.data.nextId).toBe(c)
  })

  it('wraps at the newest and the oldest', async () => {
    const [a, , c] = await insertPosts(await author(), 3)
    const newest = await api('GET', `/api/post/${a}`)
    expect(newest.json.data.prevId).toBe(c)
    const oldest = await api('GET', `/api/post/${c}`)
    expect(oldest.json.data.nextId).toBe(a)
  })

  it('a lone post is its own neighbour', async () => {
    const [p] = await insertPosts(await author(), 1)
    const res = await api('GET', `/api/post/${p}`)
    expect(res.json.data.prevId).toBe(p)
    expect(res.json.data.nextId).toBe(p)
  })

  it('answers 404 for an unknown id', async () => {
    const res = await api(
      'GET',
      `/api/post/${new mongoose.Types.ObjectId().toString()}`,
    )
    expectApiError(res, 'NOT_FOUND', "This post doesn't exist.")
  })

  it('answers 400 for a malformed id', async () => {
    const res = await api('GET', '/api/post/not-an-id')
    expectApiError(res, 'VALIDATION_FAILED', 'That id is not valid.')
  })

  it('leaves out author emails', async () => {
    const [, b] = await insertPosts(await author(), 2)
    const res = await api('GET', `/api/post/${b}`)
    expect(Object.keys(res.json.data.post.author).sort()).toEqual([
      '_id',
      'name',
    ])
  })
})
