import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PostsPage from '@/pages/posts/index.vue'
import { UPLOAD_MESSAGES } from '#shared/dto/limits'
import { MclInputFile } from '@bobbykim/mcl-forms'
import { Modal } from '@bobbykim/manguito-theme'
import { useAlertStore, usePostStore, useUserStore } from '@/stores'
import { UploadError } from '@/utils/fitImage'
import { prepareUpload } from '@/utils/prepareUpload'
import { FakeXhr } from './fakeXhr'
import { clearApiMocks, mockApi, okEnvelope, resetState } from './helpers'

// happy-dom has no canvas: sizing is tested on its own (fitImage), so here it
// hands the picked file straight through
vi.mock('@/utils/prepareUpload', () => ({
  prepareUpload: vi.fn(async (file: File) => file),
}))

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

describe('posts page upload', () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 20))
  const caption = 'Manguito on a perch'
  const pickAndSave = async (
    wrapper: Awaited<ReturnType<typeof mountAsAdmin>>,
  ) => {
    await openModal(wrapper)
    wrapper
      .findComponent(MclInputFile)
      .vm.$emit(
        'update:modelValue',
        new File(['x'], 'bird.jpg', { type: 'image/jpeg' }),
      )
    await wrapper.find('textarea').setValue(caption)
    await wrapper.find('form').trigger('submit')
    await flush()
  }
  const textarea = (wrapper: Awaited<ReturnType<typeof mountAsAdmin>>) =>
    (wrapper.find('textarea').element as HTMLTextAreaElement).value
  const fresh = {
    _id: 'p9',
    content: caption,
    imageId: 'fake/p9',
    author: { _id: 'a1', name: 'mango' },
    date: '2026-11-23T00:00:00.000Z',
    updatedAt: '2026-11-23T00:00:00.000Z',
  }
  const upstreamFailure = {
    ok: false,
    error: {
      code: 'UPSTREAM_FAILED',
      message: 'Could not upload the image, please try again.',
    },
  }

  beforeEach(() => {
    resetState()
    FakeXhr.reset()
    vi.stubGlobal('XMLHttpRequest', FakeXhr)
    vi.mocked(prepareUpload).mockImplementation(async (file: File) => file)
    mockApi('GET', '/api/post', () =>
      okEnvelope({ posts: [], nextCursor: null }),
    )
    useAlertStore(useNuxtApp().$pinia as Pinia).$patch({ alertMessage: '' })
  })
  afterEach(() => {
    clearApiMocks()
    vi.unstubAllGlobals()
  })

  it('the file input accepts JPEG, PNG and WebP', async () => {
    const wrapper = await mountAsAdmin()
    await openModal(wrapper)
    expect(wrapper.find('input[type="file"]').attributes('accept')).toBe(
      'image/jpeg,image/png,image/webp',
    )
  })

  it('a failed upload keeps the modal open with the caption', async () => {
    const wrapper = await mountAsAdmin()
    await pickAndSave(wrapper)
    FakeXhr.last.respond(502, upstreamFailure)
    await flush()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(textarea(wrapper)).toBe(caption)
  })

  it('a successful upload closes the modal and clears it', async () => {
    const wrapper = await mountAsAdmin()
    await pickAndSave(wrapper)
    FakeXhr.last.respond(201, okEnvelope(fresh))
    await settle()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await openModal(wrapper)
    expect(textarea(wrapper)).toBe('')
  })

  it('shows progress while uploading', async () => {
    const wrapper = await mountAsAdmin()
    await pickAndSave(wrapper)
    FakeXhr.last.progress(30, 100)
    await flush()
    const bar = wrapper.find('[role="progressbar"]')
    expect(bar.exists()).toBe(true)
    expect(bar.attributes('aria-valuenow')).toBe('30')
    expect(wrapper.text()).toContain('Uploading… 30%')
    FakeXhr.last.respond(201, okEnvelope(fresh))
  })

  it('a second Save while busy sends nothing', async () => {
    const wrapper = await mountAsAdmin()
    await pickAndSave(wrapper)
    await wrapper.find('form').trigger('submit')
    await flush()
    expect(FakeXhr.sent).toHaveLength(1)
    FakeXhr.last.respond(201, okEnvelope(fresh))
  })

  it('closing mid-upload keeps the caption, and a later failure alerts', async () => {
    const wrapper = await mountAsAdmin()
    await pickAndSave(wrapper)
    wrapper.findComponent(Modal).vm.close()
    await settle()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    FakeXhr.last.respond(502, upstreamFailure)
    await flush()
    expect(useAlertStore(useNuxtApp().$pinia as Pinia).alertMessage).toBe(
      'Could not upload the image, please try again.',
    )
    await openModal(wrapper)
    expect(textarea(wrapper)).toBe(caption)
  })

  it("a format the browser can't read alerts and keeps the form", async () => {
    vi.mocked(prepareUpload).mockRejectedValueOnce(
      new UploadError(UPLOAD_MESSAGES.unreadable),
    )
    const wrapper = await mountAsAdmin()
    await pickAndSave(wrapper)
    expect(FakeXhr.sent).toHaveLength(0)
    expect(useAlertStore(useNuxtApp().$pinia as Pinia).alertMessage).toBe(
      UPLOAD_MESSAGES.unreadable,
    )
    expect(textarea(wrapper)).toBe(caption)
  })
})
