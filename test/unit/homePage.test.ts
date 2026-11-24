import { mountSuspended } from '@nuxt/test-utils/runtime'
import { getQuery } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  beforeEach(() => {
    resetState()
    // the Nuxt app outlives each test: drop the cached /api/post answer
    clearNuxtData()
  })
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

  it('shows a message, not a spinner, when there are no posts', async () => {
    mockApi('GET', '/api/post', () =>
      okEnvelope({ posts: [], nextCursor: null }),
    )
    const wrapper = await mountSuspended(HomePage)
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('No photos to show right now.'),
    )
    expect(wrapper.find('.animate-spin').exists()).toBe(false)
  })

  it('shows a tile per post', async () => {
    mockApi('GET', '/api/post', () =>
      okEnvelope({ posts: [post, { ...post, _id: 'p2' }], nextCursor: null }),
    )
    const wrapper = await mountSuspended(HomePage)
    await vi.waitFor(() =>
      expect(wrapper.findAll('button[aria-label^="Flip photo"]')).toHaveLength(
        2,
      ),
    )
  })
})
