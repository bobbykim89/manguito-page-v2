import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearApiMocks,
  failEnvelope,
  mockApi,
  okEnvelope,
  resetState,
} from './helpers'

const post = {
  _id: 'p1',
  content: 'hi',
  imageId: 'fake/p1',
  author: { _id: 'u9', name: 'kiwi' },
  date: '2026-11-20T00:00:00.000Z',
  updatedAt: '2026-11-20T00:00:00.000Z',
}

describe('usePost', () => {
  beforeEach(resetState)
  afterEach(clearApiMocks)

  it('gives the post and its neighbour urls', async () => {
    mockApi('GET', '/api/post/p1', () =>
      okEnvelope({ post, prevId: 'p0', nextId: 'p2' }),
    )
    const { post: open, prevUrl, nextUrl } = await usePost('p1')
    expect(open.value._id).toBe('p1')
    expect(prevUrl.value).toBe('/posts/p0')
    expect(nextUrl.value).toBe('/posts/p2')
  })

  it('turns a 404 into a fatal 404', async () => {
    mockApi('GET', '/api/post/p404', (e) =>
      failEnvelope(e, 'NOT_FOUND', "This post doesn't exist."),
    )
    await expect(usePost('p404')).rejects.toMatchObject({
      statusCode: 404,
      fatal: true,
    })
  })

  it('turns a 400 into a fatal 404', async () => {
    mockApi('GET', '/api/post/bad', (e) =>
      failEnvelope(e, 'VALIDATION_FAILED', 'That id is not valid.'),
    )
    await expect(usePost('bad')).rejects.toMatchObject({
      statusCode: 404,
      fatal: true,
    })
  })
})
