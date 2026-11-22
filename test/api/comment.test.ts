import mongoose from 'mongoose'
import { describe, expect, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { insertUser } from '../utils/auth'
import { db } from '../utils/db'

describe('POST /api/comment/:postId', () => {
  it('a comment on a missing post gets 404', async () => {
    const { token } = await insertUser()
    const postId = new mongoose.Types.ObjectId()
    const res = await api('POST', `/api/comment/${postId}`, {
      token,
      body: { text: 'hello?' },
    })
    expectApiError(res, 'NOT_FOUND', 'Post not found')
    const stored = await (
      await db()
    ).connection
      .collection('comments')
      .countDocuments({ post: postId })
    expect(stored).toBe(0)
  })
})
