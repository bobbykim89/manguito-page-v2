import { beforeEach, describe, expect, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { insertUser } from '../utils/auth'
import { exists, insertComment, insertPost } from '../utils/content'
import { cloudinaryCalls, resetFakes } from '../utils/fakes'

beforeEach(resetFakes)

describe('PUT /api/post/:id', () => {
  it('the author can edit their post', async () => {
    const author = await insertUser('MANAGER')
    const postId = await insertPost(author.id)
    const res = await api('PUT', `/api/post/${postId}`, {
      token: author.token,
      body: { content: 'edited' },
    })
    expect(res.status).toBe(200)
    expect(res.json.data.content).toBe('edited')
  })

  it('another user cannot edit the post', async () => {
    const author = await insertUser('MANAGER')
    const admin = await insertUser('ADMIN')
    const postId = await insertPost(author.id)
    const res = await api('PUT', `/api/post/${postId}`, {
      token: admin.token,
      body: { content: 'edited' },
    })
    expectApiError(res, 'FORBIDDEN')
  })
})

describe('DELETE /api/post/:id', () => {
  it('the author can delete their post', async () => {
    const author = await insertUser('MANAGER')
    const postId = await insertPost(author.id)
    const res = await api('DELETE', `/api/post/${postId}`, {
      token: author.token,
    })
    expect(res.status).toBe(200)
    expect(await exists('posts', postId)).toBe(false)
    const destroys = (await cloudinaryCalls()).filter(
      (c) => c.method === 'POST' && c.path.endsWith('/image/destroy'),
    )
    expect(destroys).toHaveLength(1)
  })

  it('a non-author manager cannot delete the post', async () => {
    const author = await insertUser('MANAGER')
    const other = await insertUser('MANAGER')
    const postId = await insertPost(author.id)
    const res = await api('DELETE', `/api/post/${postId}`, {
      token: other.token,
    })
    expectApiError(res, 'FORBIDDEN')
    expect(await exists('posts', postId)).toBe(true)
  })

  it('an admin can delete any post', async () => {
    const author = await insertUser('MANAGER')
    const admin = await insertUser('ADMIN')
    const postId = await insertPost(author.id)
    const res = await api('DELETE', `/api/post/${postId}`, {
      token: admin.token,
    })
    expect(res.status).toBe(200)
    expect(await exists('posts', postId)).toBe(false)
  })
})

describe('DELETE /api/comment/:id', () => {
  it('the author can delete their comment', async () => {
    const postAuthor = await insertUser('MANAGER')
    const author = await insertUser('USER')
    const postId = await insertPost(postAuthor.id)
    const commentId = await insertComment(author.id, postId)
    const res = await api('DELETE', `/api/comment/${commentId}`, {
      token: author.token,
    })
    expect(res.status).toBe(200)
    expect(await exists('comments', commentId)).toBe(false)
  })

  it('another user cannot delete the comment', async () => {
    const postAuthor = await insertUser('MANAGER')
    const author = await insertUser('USER')
    const other = await insertUser('USER')
    const postId = await insertPost(postAuthor.id)
    const commentId = await insertComment(author.id, postId)
    const res = await api('DELETE', `/api/comment/${commentId}`, {
      token: other.token,
    })
    expectApiError(res, 'FORBIDDEN')
    expect(await exists('comments', commentId)).toBe(true)
  })
})
