import { getQuery } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAlertStore, usePostStore, useUserStore } from '@/stores'
import {
  clearApiMocks,
  failEnvelope,
  mockApi,
  okEnvelope,
  resetState,
} from './helpers'
import { FakeXhr } from './fakeXhr'

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
    currentUser: me as never,
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

  describe('create (uploads over XHR)', () => {
    beforeEach(() => {
      FakeXhr.reset()
      vi.stubGlobal('XMLHttpRequest', FakeXhr)
    })
    afterEach(() => vi.unstubAllGlobals())
    const answerNext = async (status: number, body: unknown) => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      FakeXhr.last.respond(status, body)
    }

    it('create prepends the new post, alerts and returns true', async () => {
      const fresh = { ...post, _id: 'p2', content: 'new' }
      const posts = loggedIn()
      const done = posts.createNewPost(new FormData())
      await answerNext(201, okEnvelope(fresh))
      expect(await done).toBe(true)
      expect(FakeXhr.last.headers.Authorization).toBe('Bearer live')
      expect(posts.posts.map((p) => p._id)).toEqual(['p2', 'p1'])
      expect(useAlertStore().alertMessage).toBe(
        'Successfully created a new post',
      )
    })

    it('a failed create alerts, returns false and leaves the list alone', async () => {
      const posts = loggedIn()
      const done = posts.createNewPost(new FormData())
      await answerNext(502, {
        ok: false,
        error: {
          code: 'UPSTREAM_FAILED',
          message: 'Could not upload the image, please try again.',
        },
      })
      expect(await done).toBe(false)
      expect(useAlertStore().alertMessage).toBe(
        'Could not upload the image, please try again.',
      )
      expect(posts.posts.map((p) => p._id)).toEqual(['p1'])
    })

    it('an expired session during upload logs out and returns false', async () => {
      const posts = loggedIn()
      const done = posts.createNewPost(new FormData())
      await answerNext(401, {
        ok: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Session expired, please log in again',
        },
      })
      expect(await done).toBe(false)
      expect(useUserStore().sessionExpired).toBe(true)
    })
  })

  it('update replaces the post in the list', async () => {
    mockApi('PUT', '/api/post/p1', () =>
      okEnvelope({ ...post, content: 'edited' }),
    )
    const posts = loggedIn()
    await posts.updatePost('p1', { content: 'edited' })
    expect(posts.posts[0]!.content).toBe('edited')
    expect(useAlertStore().alertMessage).toBe('Successfully updated post!')
  })

  it('delete removes it and returns true', async () => {
    mockApi('DELETE', '/api/post/p1', () => okEnvelope({ id: 'p1' }))
    const posts = loggedIn()
    expect(await posts.deletePostById('p1')).toBe(true)
    expect(posts.posts).toEqual([])
    expect(useAlertStore().alertMessage).toBe('Successfully deleted post!')
  })

  it('updatePost leaves a list without that post alone', async () => {
    const other = { ...post, _id: 'p9', content: 'edited' }
    mockApi('PUT', '/api/post/p9', () => okEnvelope(other))
    const posts = loggedIn()
    expect(await posts.updatePost('p9', { content: 'edited' })).toEqual(other)
    expect(posts.posts.map((p) => p._id)).toEqual(['p1'])
    expect(posts.posts[0]!.content).toBe('hi')
  })

  it('a refused update returns null', async () => {
    mockApi('PUT', '/api/post/p1', (e) =>
      failEnvelope(e, 'FORBIDDEN', 'Access denied.'),
    )
    const posts = loggedIn()
    expect(await posts.updatePost('p1', { content: 'edited' })).toBeNull()
  })

  it('a refused delete only alerts and returns false', async () => {
    mockApi('DELETE', '/api/post/p1', (e) =>
      failEnvelope(e, 'FORBIDDEN', 'Access denied.'),
    )
    const posts = loggedIn()
    expect(await posts.deletePostById('p1')).toBe(false)
    expect(posts.posts.map((p) => p._id)).toEqual(['p1'])
  })

  it('no client-side permission check', async () => {
    let hit = false
    mockApi('DELETE', '/api/post/p1', (e) => {
      hit = true
      return failEnvelope(e, 'FORBIDDEN', 'Access denied.')
    })
    const posts = loggedIn()
    // someone else's post, and a plain USER
    posts.$patch({
      posts: [{ ...post, author: { _id: 'u9', name: 'kiwi' } }] as never,
    })
    useUserStore().$patch({ currentUser: { ...me, role: 'USER' } as never })
    await posts.deletePostById('p1')
    expect(hit).toBe(true)
    expect(useAlertStore().alertMessage).toBe('Access denied.')
  })
})

const p = (id: string) => ({ ...post, _id: id })
const flush = () => new Promise((resolve) => setTimeout(resolve, 20))

describe('postStore paging', () => {
  let requests: Array<Record<string, unknown>> = []
  /** Answers each GET /api/post with the next of these pages, in order. */
  const pages = (
    ...answers: Array<{ posts: string[]; nextCursor: string | null } | 'fail'>
  ) => {
    // ofetch retries a failed GET once, so a failure answers both tries
    const queue = answers.flatMap((a) =>
      a === 'fail' ? ['fail', 'fail'] : [a],
    )
    mockApi('GET', '/api/post', async (e) => {
      requests.push(getQuery(e))
      const answer = queue.shift()
      if (!answer || answer === 'fail')
        return failEnvelope(
          e,
          'INTERNAL',
          'Something went wrong, please try again.',
        )
      await flush()
      return okEnvelope({
        posts: answer.posts.map(p),
        nextCursor: answer.nextCursor,
      })
    })
  }

  beforeEach(() => {
    resetState()
    requests = []
  })
  afterEach(clearApiMocks)

  it('loadFirstPage loads once', async () => {
    pages({ posts: ['p1'], nextCursor: 'c1' })
    const store = usePostStore()
    await Promise.all([store.loadFirstPage(), store.loadFirstPage()])
    await store.loadFirstPage()
    expect(requests).toHaveLength(1)
    expect(store.posts.map((x) => x._id)).toEqual(['p1'])
    expect(store.loaded).toBe(true)
    expect(store.status).toBe('idle')
  })

  it('loadFirstPage marks done when there is no cursor', async () => {
    pages({ posts: ['p1'], nextCursor: null })
    const store = usePostStore()
    await store.loadFirstPage()
    expect(store.status).toBe('done')
  })

  it('loadFirstPage keeps the server result while hydrating', async () => {
    pages({ posts: ['p1'], nextCursor: null })
    const store = usePostStore()
    // page one failed during the server render
    store.$patch({ status: 'error' })
    const nuxtApp = useNuxtApp()
    nuxtApp.isHydrating = true
    try {
      await store.loadFirstPage()
    } finally {
      nuxtApp.isHydrating = false
    }
    expect(requests).toHaveLength(0)
    expect(store.status).toBe('error')
    await store.retry()
    expect(requests).toHaveLength(1)
    expect(store.posts.map((x) => x._id)).toEqual(['p1'])
  })

  it('loadMore appends the next page', async () => {
    pages(
      { posts: ['p1'], nextCursor: 'c1' },
      { posts: ['p2'], nextCursor: null },
    )
    const store = usePostStore()
    await store.loadFirstPage()
    await store.loadMore()
    expect(store.posts.map((x) => x._id)).toEqual(['p1', 'p2'])
    expect(store.status).toBe('done')
    expect(requests[1]!.cursor).toBe('c1')
  })

  it('loadMore ignores calls while loading', async () => {
    pages(
      { posts: ['p1'], nextCursor: 'c1' },
      { posts: ['p2'], nextCursor: 'c2' },
    )
    const store = usePostStore()
    await store.loadFirstPage()
    await Promise.all([store.loadMore(), store.loadMore()])
    expect(requests).toHaveLength(2)
  })

  it('loadMore does nothing before the first page or after the end', async () => {
    pages({ posts: ['p1'], nextCursor: null })
    const store = usePostStore()
    await store.loadMore()
    expect(requests).toHaveLength(0)
    await store.loadFirstPage()
    await store.loadMore()
    expect(requests).toHaveLength(1)
  })

  it('loadMore skips ids already in the list', async () => {
    pages(
      { posts: ['p1'], nextCursor: 'c1' },
      { posts: ['p1', 'p2'], nextCursor: null },
    )
    const store = usePostStore()
    await store.loadFirstPage()
    await store.loadMore()
    expect(store.posts.map((x) => x._id)).toEqual(['p1', 'p2'])
  })

  it('a failed loadMore sets error and retry recovers', async () => {
    pages({ posts: ['p1'], nextCursor: 'c1' }, 'fail', {
      posts: ['p2'],
      nextCursor: null,
    })
    const store = usePostStore()
    await store.loadFirstPage()
    await store.loadMore()
    expect(store.status).toBe('error')
    expect(useAlertStore().alertMessage).toBe(
      'Something went wrong, please try again.',
    )
    await store.retry()
    expect(store.posts.map((x) => x._id)).toEqual(['p1', 'p2'])
    expect(store.status).toBe('done')
    expect(requests.at(-1)!.cursor).toBe('c1')
  })

  it('a failed first page retries the first page', async () => {
    pages('fail', { posts: ['p1'], nextCursor: null })
    const store = usePostStore()
    await store.loadFirstPage()
    expect(store.status).toBe('error')
    expect(store.loaded).toBe(false)
    await store.retry()
    expect(requests.at(-1)!.cursor).toBeUndefined()
    expect(store.posts.map((x) => x._id)).toEqual(['p1'])
  })
})
