import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import AdminCommentsPage from '@/pages/admin/comments.vue'
import { useAlertStore } from '@/stores'
import {
  clearApiMocks,
  failEnvelope,
  mockApi,
  okEnvelope,
  resetState,
} from './helpers'

const comment = {
  _id: 'c1',
  text: 'cute bird',
  author: { _id: 'u2', name: 'kiwi' },
  post: { _id: 'p1' },
  date: '2026-11-20T00:00:00.000Z',
}

describe('admin comments delete', () => {
  let reads = 0
  beforeEach(() => {
    resetState()
    reads = 0
    useAuthToken().value = 'Bearer admin'
    mockApi('GET', '/api/comment', () => {
      reads += 1
      return okEnvelope([comment])
    })
  })
  afterEach(clearApiMocks)

  it('alerts a refusal and does not reload', async () => {
    mockApi('DELETE', '/api/comment/c1', (e) =>
      failEnvelope(e, 'FORBIDDEN', 'Access denied.'),
    )
    const wrapper = await mountSuspended(AdminCommentsPage)
    expect(reads).toBe(1)
    await wrapper.find('button[aria-label="delete comment"]').trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 50))
    const alertStore = useAlertStore(useNuxtApp().$pinia as Pinia)
    expect(alertStore.alertMessage).toBe('Access denied.')
    expect(reads).toBe(1)
  })
})
