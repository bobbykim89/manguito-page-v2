import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startStores } from '@/plugins/init.plugin'
import { useUserStore } from '@/stores'
import { clearApiMocks, mockApi, okEnvelope, resetState } from './helpers'

const user = { _id: 'u1', name: 'mango', email: 'm@example.test', role: 'USER' }

describe('startup', () => {
  beforeEach(resetState)
  afterEach(clearApiMocks)

  it('startup checks the session and loads no posts', async () => {
    useAuthToken().value = 'Bearer live'
    let postReads = 0
    mockApi('GET', '/api/post', () => {
      postReads += 1
      return okEnvelope({ posts: [], nextCursor: null })
    })
    mockApi('GET', '/api/auth', () => okEnvelope(user))
    await startStores({ userStore: useUserStore() })
    expect(useUserStore().isAuthenticated).toBe(true)
    expect(postReads).toBe(0)
  })
})
