import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminPostsPage from '@/pages/admin/posts.vue'
import { usePostStore, useUserStore } from '@/stores'
import { clearApiMocks, mockApi, okEnvelope, resetState } from './helpers'

const admin = {
  _id: 'a1',
  name: 'mango',
  email: 'a@example.test',
  role: 'ADMIN',
}
const post = (id: string) => ({
  _id: id,
  content: `post ${id}`,
  imageId: `fake/${id}`,
  author: { _id: 'a1', name: 'mango' },
  date: '2026-11-20T00:00:00.000Z',
  updatedAt: '2026-11-20T00:00:00.000Z',
})

describe('admin posts page', () => {
  beforeEach(() => {
    resetState()
    useAuthToken().value = 'Bearer admin'
    const pinia = useNuxtApp().$pinia as Pinia
    useUserStore(pinia).$patch({ currentUser: admin as never })
    usePostStore(pinia).$patch({
      posts: [post('p1'), post('p2')] as never,
      loaded: true,
      status: 'done',
    })
  })
  afterEach(() => {
    clearApiMocks()
    vi.unstubAllGlobals()
  })

  it('deleting a post removes it from the shared list', async () => {
    vi.stubGlobal('confirm', () => true)
    mockApi('DELETE', '/api/post/p1', () => okEnvelope({ id: 'p1' }))
    const wrapper = await mountSuspended(AdminPostsPage)
    await wrapper
      .findAll('button[aria-label="delete post"]')[0]!
      .trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 50))
    const store = usePostStore(useNuxtApp().$pinia as Pinia)
    expect(store.posts.map((p) => p._id)).toEqual(['p2'])
  })
})
