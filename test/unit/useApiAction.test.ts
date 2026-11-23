import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAlertStore, useUserStore } from '@/stores'
import {
  clearApiMocks,
  failEnvelope,
  mockApi,
  okEnvelope,
  resetState,
} from './helpers'

const SESSION = 'Session expired, please log in again'
const user = { _id: 'u1', name: 'mango', email: 'm@example.test', role: 'USER' }

describe('useApiAction', () => {
  beforeEach(resetState)
  afterEach(clearApiMocks)

  it('returns the data and shows the success alert', async () => {
    mockApi('GET', '/api/thing', () => okEnvelope({ n: 1 }))
    const { run } = useApiAction()
    const res = await run(() => useNuxtApp().$api('/api/thing'), {
      success: 'Done!',
    })
    expect(res).toEqual({ ok: true, data: { n: 1 } })
    const alert = useAlertStore()
    expect(alert.alertMessage).toBe('Done!')
    expect(alert.alertColor).toBe('success')
  })

  it('shows no alert on success without a message', async () => {
    mockApi('GET', '/api/thing', () => okEnvelope(1))
    const { run } = useApiAction()
    await run(() => useNuxtApp().$api('/api/thing'))
    expect(useAlertStore().alertMessage).toBeNull()
  })

  it('alerts a failure and returns ok: false', async () => {
    mockApi('GET', '/api/thing', (e) =>
      failEnvelope(e, 'FORBIDDEN', 'Access denied.'),
    )
    const userStore = useUserStore()
    userStore.$patch({ currentUser: user as never })
    const { run } = useApiAction()
    const res = await run(() => useNuxtApp().$api('/api/thing'))
    expect(res).toEqual({ ok: false })
    expect(useAlertStore().alertMessage).toBe('Access denied.')
    expect(userStore.currentUser).not.toBeNull()
  })

  it('ends a dead session, then alerts', async () => {
    mockApi('GET', '/api/thing', (e) =>
      failEnvelope(e, 'UNAUTHENTICATED', SESSION),
    )
    useAuthToken().value = 'Bearer x'
    const userStore = useUserStore()
    userStore.$patch({ currentUser: user as never })
    const { run } = useApiAction()
    await run(() => useNuxtApp().$api('/api/thing'))
    expect(userStore.currentUser).toBeNull()
    expect(useAuthToken().value).toBeNull()
    expect(useAlertStore().alertMessage).toBe(SESSION)
  })

  it('quiet: ends a dead session without an alert', async () => {
    mockApi('GET', '/api/thing', (e) =>
      failEnvelope(e, 'UNAUTHENTICATED', SESSION),
    )
    useAuthToken().value = 'Bearer x'
    const userStore = useUserStore()
    userStore.$patch({ currentUser: user as never })
    const { run } = useApiAction()
    await run(() => useNuxtApp().$api('/api/thing'), { quiet: true })
    expect(userStore.currentUser).toBeNull()
    expect(useAlertStore().alertMessage).toBeNull()
  })

  it('never throws', async () => {
    const { run } = useApiAction()
    const res = await run(() => Promise.reject(new Error('boom')))
    expect(res).toEqual({ ok: false })
    expect(useAlertStore().alertMessage).toBe('boom')
  })
})
