import { beforeEach, describe, expect, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { deleteUser, insertUser, signup } from '../utils/auth'
import { insertComment, insertPost } from '../utils/content'
import { db } from '../utils/db'
import { resetFakes } from '../utils/fakes'
import { userReadsFor } from '../utils/profile'

// a 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

beforeEach(resetFakes)

describe('the current user is read once per request', () => {
  it('GET /api/auth reads its user once', async () => {
    const u = await signup()
    const doc = await (
      await db()
    ).connection
      .collection('users')
      .findOne({ email: u.email })
    const id = doc!._id.toString()
    const reads = await userReadsFor(id, async () => {
      const res = await api('GET', '/api/auth', { token: u.token })
      expect(res.status).toBe(200)
    })
    expect(reads).toBe(1)
  })

  it('creating a post reads its user once', async () => {
    const { id, token } = await insertUser('MANAGER')
    const reads = await userReadsFor(id, async () => {
      const form = new FormData()
      form.append('image', new Blob([PNG], { type: 'image/png' }), 'b.png')
      form.append('content', 'Manguito says hi')
      const res = await api('POST', '/api/post', { token, raw: form })
      expect(res.status).toBe(201)
    })
    expect(reads).toBe(1)
  })

  it('updating a post reads its user once', async () => {
    const { id, token } = await insertUser('MANAGER')
    const postId = await insertPost(id)
    const reads = await userReadsFor(id, async () => {
      const res = await api('PUT', `/api/post/${postId}`, {
        token,
        body: { content: 'edited' },
      })
      expect(res.status).toBe(200)
    })
    expect(reads).toBe(1)
  })

  it('deleting a comment reads its user once', async () => {
    const author = await insertUser('MANAGER')
    const postId = await insertPost(author.id)
    const { id, token } = await insertUser()
    const commentId = await insertComment(id, postId)
    const reads = await userReadsFor(id, async () => {
      const res = await api('DELETE', `/api/comment/${commentId}`, { token })
      expect(res.status).toBe(200)
    })
    expect(reads).toBe(1)
  })
})

describe('the loader never serves a stale or missing user', () => {
  it('a username change returns the new name', async () => {
    const { token } = await insertUser()
    const name = `renamed-${Date.now() % 1e8}`
    const res = await api('PUT', '/api/user/user-info/username', {
      token,
      body: { username: name },
    })
    expect(res.status).toBe(200)
    expect(res.json.data.name).toBe(name)
  })

  it("a deleted user's token gets 401 on a route that never loaded the user", async () => {
    const author = await insertUser('MANAGER')
    const postId = await insertPost(author.id)
    const { id, token } = await insertUser()
    await deleteUser(id)
    const res = await api('POST', `/api/comment/${postId}`, {
      token,
      body: { text: 'hello' },
    })
    expectApiError(
      res,
      'UNAUTHENTICATED',
      'Session expired, please log in again',
    )
  })
})
