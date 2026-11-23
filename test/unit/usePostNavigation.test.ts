import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useAlertStore, usePostStore } from '@/stores'
import { resetState } from './helpers'

const post = (id: string) => ({
  _id: id,
  content: `post ${id}`,
  imageId: `fake/${id}`,
  author: { _id: 'u1', name: 'mango' },
  date: '2026-11-20T00:00:00.000Z',
  updatedAt: '2026-11-20T00:00:00.000Z',
})

describe('usePostNavigation', () => {
  beforeEach(() => {
    resetState()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('wraps prev and next around the list', () => {
    usePostStore().$patch({ posts: [post('a'), post('b'), post('c')] as never })
    const nav = usePostNavigation('a')
    expect(nav.currentPost.value?._id).toBe('a')
    expect(nav.prevUrl.value).toBe('/posts/c')
    expect(nav.nextUrl.value).toBe('/posts/b')
  })

  it('falls back to /posts with no posts', () => {
    const nav = usePostNavigation('a')
    expect(nav.prevUrl.value).toBe('/posts')
    expect(nav.nextUrl.value).toBe('/posts')
    expect(nav.currentPost.value).toBeNull()
    expect(useAlertStore().alertMessage).toBeNull()
  })

  it('alerts and leaves for an unknown id once posts are loaded', async () => {
    const push = vi.spyOn(useRouter(), 'push')
    usePostStore().$patch({ posts: [post('a')] as never })
    usePostNavigation('zzz')
    expect(useAlertStore().alertMessage).toBe('Error: Invalid Post ID ')
    expect(push).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(500)
    expect(push).toHaveBeenCalledWith('/posts')
  })

  it('removing the open post from the list does not alert', async () => {
    const push = vi.spyOn(useRouter(), 'push')
    const posts = usePostStore()
    posts.$patch({ posts: [post('a'), post('b')] as never })
    usePostNavigation('a')
    posts.posts = posts.posts.filter((p) => p._id !== 'a')
    await nextTick()
    await vi.advanceTimersByTimeAsync(1000)
    expect(useAlertStore().alertMessage).toBeNull()
    expect(push).not.toHaveBeenCalled()
  })
})
