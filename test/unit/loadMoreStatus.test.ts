import { mountSuspended } from '@nuxt/test-utils/runtime'
import { getQuery } from 'h3'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LoadMoreStatus from '@/components/posts/LoadMoreStatus.vue'
import { usePostStore } from '@/stores'
import {
  clearApiMocks,
  failEnvelope,
  mockApi,
  okEnvelope,
  resetState,
} from './helpers'

const p = (id: string) => ({
  _id: id,
  content: 'hi',
  imageId: `fake/${id}`,
  author: { _id: 'u1', name: 'mango' },
  date: '2026-11-20T00:00:00.000Z',
  updatedAt: '2026-11-20T00:00:00.000Z',
})
const flush = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms))

type Entry = { isIntersecting: boolean }
let observers: Array<(entries: Entry[]) => void> = []
/** Whether the sentinel is in range right now, as a real observer would see it. */
let current = false
class FakeObserver {
  constructor(private callback: (entries: Entry[]) => void) {
    observers.push(callback)
  }
  // a real IntersectionObserver reports the target's state once it starts
  // observing, after layout
  observe() {
    setTimeout(() => this.callback([{ isIntersecting: current }]), 0)
  }
  unobserve() {}
  disconnect() {
    observers = observers.filter((cb) => cb !== this.callback)
  }
  takeRecords() {
    return []
  }
}
const setInView = (isIntersecting: boolean) => {
  current = isIntersecting
  observers.forEach((callback) => callback([{ isIntersecting }]))
}

const store = () => usePostStore(useNuxtApp().$pinia as Pinia)
// mounted components outlive a test unless unmounted, and would react to the
// next test's store patch
const mounted: Array<{ unmount: () => void }> = []
const mount = async () => {
  const wrapper = await mountSuspended(LoadMoreStatus)
  mounted.push(wrapper)
  return wrapper
}
let requests: Array<Record<string, unknown>> = []
/** Answers each GET /api/post with the next page (or a failure). */
const pages = (
  ...answers: Array<{ posts: string[]; nextCursor: string | null } | 'fail'>
) => {
  mockApi('GET', '/api/post', async (e) => {
    requests.push(getQuery(e))
    const answer = answers[0]
    // a failure stays (ofetch retries a failed GET once)
    if (answer !== 'fail') answers.shift()
    await flush(10)
    if (!answer || answer === 'fail')
      return failEnvelope(
        e,
        'INTERNAL',
        'Something went wrong, please try again.',
      )
    return okEnvelope({
      posts: answer.posts.map(p),
      nextCursor: answer.nextCursor,
    })
  })
}

describe('LoadMoreStatus', () => {
  beforeEach(() => {
    resetState()
    observers = []
    current = false
    requests = []
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    store().$patch({
      posts: [p('p1')] as never,
      nextCursor: 'c',
      status: 'idle',
      loaded: true,
    })
  })
  afterEach(() => {
    while (mounted.length) mounted.pop()!.unmount()
    clearApiMocks()
    vi.unstubAllGlobals()
  })

  it('shows the loading line', async () => {
    store().$patch({ status: 'loading' })
    const wrapper = await mount()
    expect(wrapper.text()).toContain('Loading more photos…')
  })

  it('shows the end line when done with posts', async () => {
    store().$patch({ status: 'done', nextCursor: null })
    const wrapper = await mount()
    expect(wrapper.text()).toContain("That's every photo of Manguito!")
  })

  it('shows the empty line when done with no posts', async () => {
    store().$patch({ status: 'done', nextCursor: null, posts: [] })
    const wrapper = await mount()
    expect(wrapper.text()).toContain('No photos yet.')
    expect(wrapper.text()).not.toContain('every photo')
  })

  it('shows the error line and retries', async () => {
    pages({ posts: ['p2'], nextCursor: null })
    store().$patch({ status: 'error' })
    const wrapper = await mount()
    expect(wrapper.text()).toContain("Couldn't load more photos.")
    const button = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Try again')!
    await button.trigger('click')
    await flush()
    expect(requests[0]!.cursor).toBe('c')
    expect(store().posts.map((x) => x._id)).toEqual(['p1', 'p2'])
  })

  it('loads more when the sentinel comes into view', async () => {
    pages({ posts: ['p2'], nextCursor: null })
    await mount()
    expect(requests).toHaveLength(0)
    setInView(true)
    await flush()
    expect(requests).toHaveLength(1)
    expect(requests[0]!.cursor).toBe('c')
  })

  it('keeps loading while the sentinel stays in view', async () => {
    pages(
      { posts: ['p2'], nextCursor: 'c2' },
      { posts: ['p3'], nextCursor: null },
    )
    await mount()
    setInView(true)
    await flush(200)
    expect(requests.map((q) => q.cursor)).toEqual(['c', 'c2'])
    expect(store().status).toBe('done')
  })

  it('does not retry by itself after an error', async () => {
    pages('fail')
    await mount()
    setInView(true)
    await flush(200)
    const afterFailure = requests.length
    expect(store().status).toBe('error')
    await flush(200)
    expect(requests.length).toBe(afterFailure)
    expect(store().status).toBe('error')
  })

  it('announces how many photos a load added', async () => {
    pages({ posts: ['p2', 'p3', 'p4', 'p5', 'p6'], nextCursor: 'c2' })
    const wrapper = await mount()
    await store().loadMore()
    await flush(10)
    expect(wrapper.find('[role="status"]').text()).toBe('Loaded 5 more photos.')
  })

  it('announces nothing on mount', async () => {
    store().$patch({ status: 'done', nextCursor: null })
    const wrapper = await mount()
    expect(wrapper.find('[role="status"]').text()).toBe('')
  })

  it('loads one page per trigger when the new tiles push the sentinel away', async () => {
    pages(
      { posts: ['p2'], nextCursor: 'c2' },
      { posts: ['p3'], nextCursor: null },
    )
    await mount()
    await flush(10) // the observer's first report (out of range)
    setInView(true)
    // the page lands and its tiles push the sentinel out of range
    current = false
    await flush(200)
    expect(requests.map((q) => q.cursor)).toEqual(['c'])
    expect(store().status).toBe('idle')
  })
})
