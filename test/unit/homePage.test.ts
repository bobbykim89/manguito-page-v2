import { mountSuspended } from '@nuxt/test-utils/runtime'
import { getQuery } from 'h3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import HomePage from '@/pages/index.vue'
import { clearApiMocks, mockApi, okEnvelope, resetState } from './helpers'

const post = {
  _id: 'p1',
  content: 'hi',
  imageId: 'fake/p1',
  author: { _id: 'u1', name: 'mango' },
  date: '2026-11-20T00:00:00.000Z',
  updatedAt: '2026-11-20T00:00:00.000Z',
}

describe('home page', () => {
  beforeEach(resetState)
  afterEach(clearApiMocks)

  it('asks for the 7 newest posts', async () => {
    let limit: unknown
    mockApi('GET', '/api/post', (e) => {
      limit = getQuery(e).limit
      return okEnvelope({ posts: [post], nextCursor: 'x' })
    })
    await mountSuspended(HomePage)
    expect(limit).toBe('7')
  })
})
