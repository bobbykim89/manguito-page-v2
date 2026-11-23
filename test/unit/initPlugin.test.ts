import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startStores } from '@/plugins/init.plugin'
import { usePostStore, useUserStore } from '@/stores'
import { clearApiMocks, mockApi, okEnvelope, resetState } from './helpers'

const user = { _id: 'u1', name: 'mango', email: 'm@example.test', role: 'USER' }

describe('startup', () => {
  beforeEach(resetState)
  afterEach(clearApiMocks)

  it('loads posts and checks the session concurrently', async () => {
    useAuthToken().value = 'Bearer live'
    let authEntered!: () => void
    const authStarted = new Promise<void>((resolve) => (authEntered = resolve))
    let overlapped = false
    mockApi('GET', '/api/post', async () => {
      // with sequential startup the session check can't start until this ends
      overlapped = await Promise.race([
        authStarted.then(() => true),
        new Promise<boolean>((r) => setTimeout(() => r(false), 300)),
      ])
      return okEnvelope([])
    })
    mockApi('GET', '/api/auth', () => {
      authEntered()
      return okEnvelope(user)
    })
    await startStores({ postStore: usePostStore(), userStore: useUserStore() })
    expect(overlapped).toBe(true)
    expect(useUserStore().isAuthenticated).toBe(true)
    expect(usePostStore().posts).toEqual([])
  })
})
