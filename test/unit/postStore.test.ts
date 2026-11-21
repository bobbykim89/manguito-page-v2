import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAlertStore, usePostStore, useUserStore } from '@/stores'
import {
  clearApiMocks,
  failEnvelope,
  mockApi,
  okEnvelope,
  resetState,
} from './helpers'

const me = { _id: 'u1', name: 'mango', email: 'm@example.test', role: 'ADMIN' }
const post = {
  _id: 'p1',
  content: 'hi',
  imageId: 'fake/p1',
  author: { _id: 'u1', name: 'mango' },
  date: '2026-11-20T00:00:00.000Z',
  updatedAt: '2026-11-20T00:00:00.000Z',
}

const loggedIn = () => {
  useAuthToken().value = 'Bearer live'
  useUserStore().$patch({
    isAuthenticated: true,
    currentUser: me as never,
    role: 'ADMIN',
  })
  const posts = usePostStore()
  posts.$patch({ posts: [post] as never })
  return posts
}

describe('postStore session handling', () => {
  beforeEach(resetState)
  afterEach(clearApiMocks)

  it('an expired session logs out and keeps the post', async () => {
    mockApi('DELETE', '/api/post/p1', (e) =>
      failEnvelope(
        e,
        'UNAUTHENTICATED',
        'Session expired, please log in again',
      ),
    )
    const posts = loggedIn()
    await posts.deletePostById('p1')
    const user = useUserStore()
    expect(user.sessionExpired).toBe(true)
    expect(user.isAuthenticated).toBe(false)
    expect(useAuthToken().value).toBeFalsy()
    expect(useAlertStore().alertMessage).toBe(
      'Session expired, please log in again',
    )
    expect(posts.posts.map((p) => p._id)).toEqual(['p1'])
  })

  it('a refusal only alerts', async () => {
    mockApi('PUT', '/api/post/p1', (e) =>
      failEnvelope(e, 'FORBIDDEN', 'Access denied.'),
    )
    const posts = loggedIn()
    await posts.updatePost('p1', { content: 'edited' })
    const user = useUserStore()
    expect(useAlertStore().alertMessage).toBe('Access denied.')
    expect(user.isAuthenticated).toBe(true)
    expect(user.sessionExpired).toBe(false)
    expect(useAuthToken().value).toBe('Bearer live')
    expect(posts.posts[0]!.content).toBe('hi')
  })

  it('a failed load alerts and leaves no posts', async () => {
    mockApi('GET', '/api/post', (e) =>
      failEnvelope(e, 'INTERNAL', 'Something went wrong, please try again.'),
    )
    const posts = usePostStore()
    await posts.getAllPosts()
    expect(useAlertStore().alertMessage).toBe(
      'Something went wrong, please try again.',
    )
    expect(posts.posts).toEqual([])
  })

  it('a load gives the posts', async () => {
    mockApi('GET', '/api/post', () => okEnvelope([post]))
    const posts = usePostStore()
    await posts.getAllPosts()
    expect(posts.posts.map((p) => p._id)).toEqual(['p1'])
  })
})
