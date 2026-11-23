import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAlertStore } from '@/stores'
import {
  clearApiMocks,
  failEnvelope,
  mockApi,
  okEnvelope,
  resetState,
} from './helpers'

const flush = () => new Promise((resolve) => setTimeout(resolve, 20))

describe('usePostComments', () => {
  let reads = 0
  beforeEach(() => {
    resetState()
    reads = 0
    useAuthToken().value = 'Bearer live'
    mockApi('GET', '/api/comment/p1', () => {
      reads += 1
      return okEnvelope([])
    })
  })
  afterEach(clearApiMocks)

  it('addComment posts, alerts and reloads', async () => {
    mockApi('POST', '/api/comment/p1', () => okEnvelope({ _id: 'c1' }))
    const { addComment } = await usePostComments('p1')
    const before = reads
    await addComment('hello')
    await flush()
    expect(useAlertStore().alertMessage).toBe('Successfully created a comment!')
    expect(reads).toBe(before + 1)
  })

  it('removeComment deletes, alerts and reloads', async () => {
    mockApi('DELETE', '/api/comment/c1', () => okEnvelope({ id: 'c1' }))
    const { removeComment } = await usePostComments('p1')
    const before = reads
    await removeComment('c1')
    await flush()
    expect(useAlertStore().alertMessage).toBe('Successfully deleted a comment!')
    expect(reads).toBe(before + 1)
  })

  it('a failed add alerts and does not reload', async () => {
    mockApi('POST', '/api/comment/p1', (e) =>
      failEnvelope(e, 'NOT_FOUND', 'Post not found'),
    )
    const { addComment } = await usePostComments('p1')
    const before = reads
    await addComment('hello')
    await flush()
    expect(useAlertStore().alertMessage).toBe('Post not found')
    expect(reads).toBe(before)
  })
})
