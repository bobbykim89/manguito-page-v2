import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import PostsPage from '@/pages/posts/index.vue'
import { usePostStore, useUserStore } from '@/stores'
import { clearApiMocks, mockApi, okEnvelope, resetState } from './helpers'

const admin = {
  _id: 'a1',
  name: 'mango',
  email: 'admin@example.test',
  role: 'ADMIN',
}

// The mounted page reads the Nuxt app's Pinia, not the one resetState() activates.
const mountAsAdmin = async () => {
  const user = useUserStore(useNuxtApp().$pinia as Pinia)
  user.$patch({
    currentUser: admin as never,
  })
  // test-utils stubs <Transition> by default, so the Modal's after-enter hook
  // (which lets it close) would never run
  return mountSuspended(PostsPage, {
    global: { stubs: { transition: false } },
  })
}

// Modal transitions finish after a frame; until the enter transition ends the
// Modal ignores close requests, as a real user never clicks that fast.
const settle = () => new Promise((resolve) => setTimeout(resolve, 100))

const openModal = async (wrapper: Awaited<ReturnType<typeof mountAsAdmin>>) => {
  await wrapper.find('button[aria-label="new post"]').trigger('click')
  await settle()
}

describe('posts page new-post modal', () => {
  beforeEach(() => {
    resetState()
    mockApi('GET', '/api/post', () =>
      okEnvelope({ posts: [], nextCursor: null }),
    )
  })
  afterEach(() => {
    clearApiMocks()
  })

  it('opens the new-post modal from the new post button', async () => {
    const wrapper = await mountAsAdmin()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await openModal(wrapper)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })

  it('gives the modal its rounded corners', async () => {
    const wrapper = await mountAsAdmin()
    await openModal(wrapper)
    expect(wrapper.find('[role="dialog"]').classes()).toContain('rounded-lg')
  })

  it('requires a file', async () => {
    const wrapper = await mountAsAdmin()
    await openModal(wrapper)
    expect(
      wrapper.find('input[type="file"]').attributes('required'),
    ).toBeDefined()
  })

  it('new-post form flags a caption over 1000 characters', async () => {
    const wrapper = await mountAsAdmin()
    await openModal(wrapper)
    await wrapper.find('textarea').setValue('x'.repeat(1001))
    expect(wrapper.text()).toContain('Captions can be at most 1000 characters.')
    expect(
      wrapper.find('button[type="submit"]').attributes('disabled'),
    ).toBeDefined()
  })

  it('opens again after Cancel, with an empty form', async () => {
    const wrapper = await mountAsAdmin()
    await openModal(wrapper)
    await wrapper.find('textarea').setValue('a caption')
    await wrapper.find('button[type="reset"]').trigger('click')
    await settle()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await openModal(wrapper)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(
      (wrapper.find('textarea').element as HTMLTextAreaElement).value,
    ).toBe('')
  })
})

describe('posts page grid', () => {
  beforeEach(() => {
    resetState()
    // the mounted page reads the Nuxt app's Pinia, which outlives each test
    usePostStore(useNuxtApp().$pinia as Pinia).$patch({
      posts: [],
      nextCursor: null,
      status: 'idle',
      loaded: false,
      gridScrollTop: null,
    })
  })
  afterEach(clearApiMocks)

  it("renders the first page's tiles", async () => {
    const tile = (id: string) => ({
      _id: id,
      content: 'hi',
      imageId: `fake/${id}`,
      author: { _id: 'a1', name: 'mango' },
      date: '2026-11-20T00:00:00.000Z',
      updatedAt: '2026-11-20T00:00:00.000Z',
    })
    mockApi('GET', '/api/post', () =>
      okEnvelope({ posts: [tile('p1'), tile('p2')], nextCursor: null }),
    )
    const wrapper = await mountSuspended(PostsPage)
    const links = wrapper
      .findAll('a')
      .map((a) => a.attributes('href'))
      .filter((href) => href?.startsWith('/posts/'))
    expect(links).toEqual(['/posts/p1', '/posts/p2'])
    expect(wrapper.text()).not.toContain('Load More')
  })

  it('remembers the scroll position when leaving for a post', async () => {
    mockApi('GET', '/api/post', () =>
      okEnvelope({ posts: [], nextCursor: null }),
    )
    await mountSuspended(PostsPage, { route: '/posts' })
    Object.defineProperty(window, 'scrollY', { value: 400, configurable: true })
    await useRouter().push('/posts/p1')
    expect(usePostStore(useNuxtApp().$pinia as Pinia).gridScrollTop).toBe(400)
  })

  it('leaving for another page leaves it alone', async () => {
    mockApi('GET', '/api/post', () =>
      okEnvelope({ posts: [], nextCursor: null }),
    )
    await mountSuspended(PostsPage, { route: '/posts' })
    Object.defineProperty(window, 'scrollY', { value: 400, configurable: true })
    await useRouter().push('/about')
    expect(usePostStore(useNuxtApp().$pinia as Pinia).gridScrollTop).toBeNull()
  })
})
