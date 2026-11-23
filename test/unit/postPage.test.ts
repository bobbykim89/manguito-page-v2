import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import CommentInput from '@/components/posts/CommentInput.vue'
import PostPage from '@/pages/posts/[id].vue'
import { useAlertStore, usePostStore, useUserStore } from '@/stores'
import {
  clearApiMocks,
  failEnvelope,
  mockApi,
  okEnvelope,
  resetState,
} from './helpers'

const me = { _id: 'u1', name: 'mango', email: 'm@example.test', role: 'USER' }
const post = {
  _id: 'p1',
  content: 'hi',
  imageId: 'fake/p1',
  author: { _id: 'u9', name: 'kiwi' },
  date: '2026-11-20T00:00:00.000Z',
  updatedAt: '2026-11-20T00:00:00.000Z',
}

describe('post page comments', () => {
  let reads = 0
  beforeEach(() => {
    resetState()
    reads = 0
    useAuthToken().value = 'Bearer live'
    const pinia = useNuxtApp().$pinia as Pinia
    useUserStore(pinia).$patch({
      currentUser: me as never,
    })
    usePostStore(pinia).$patch({ posts: [post] as never })
    mockApi('GET', '/api/comment/p1', () => {
      reads += 1
      return okEnvelope([])
    })
  })
  afterEach(clearApiMocks)

  it('alerts a failed comment instead of success', async () => {
    mockApi('POST', '/api/comment/p1', (e) =>
      failEnvelope(e, 'INTERNAL', 'Something went wrong, please try again.'),
    )
    const wrapper = await mountSuspended(PostPage, { route: '/posts/p1' })
    const readsBefore = reads
    wrapper.findComponent(CommentInput).vm.$emit('submit-comment', 'hello')
    await new Promise((resolve) => setTimeout(resolve, 50))
    const alertStore = useAlertStore(useNuxtApp().$pinia as Pinia)
    expect(alertStore.alertMessage).toBe(
      'Something went wrong, please try again.',
    )
    expect(reads).toBe(readsBefore)
  })
})
