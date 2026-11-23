import { type UpdatePostInput } from '#shared/dto/post'
import type { PostPage, PostType } from '#shared/types'
import { useApiAction } from '@/composables/useApiAction'
import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Where the list stands: `done` means the last page has arrived. */
export type PostListStatus = 'idle' | 'loading' | 'error' | 'done'

/**
 * The post list the grid and /admin/posts share, loaded a page at a time and
 * kept for the life of the app (so coming back to the grid shows the same
 * photos), and the actions that change it. The server decides who may change
 * what; a refusal comes back as an alert.
 */
export const usePostStore = defineStore('post', () => {
  const { $api } = useNuxtApp()
  const { run } = useApiAction()

  // POST: states
  const posts = ref<PostType[]>([])
  const nextCursor = ref<string | null>(null)
  const status = ref<PostListStatus>('idle')
  /** Page one has arrived (in SSR, this hydrates, so the client skips it). */
  const loaded = ref<boolean>(false)
  /** How far down the grid was when a post was opened (browser only). */
  const gridScrollTop = ref<number | null>(null)

  // POST: actions
  const settle = (page: PostPage) => {
    nextCursor.value = page.nextCursor
    status.value = page.nextCursor ? 'idle' : 'done'
  }
  /** Loads page one, unless it's already here or on its way. */
  const loadFirstPage = async () => {
    if (loaded.value || status.value === 'loading') return
    status.value = 'loading'
    const res = await run(() => $api<PostPage>('/api/post'))
    if (!res.ok) {
      status.value = 'error'
      return
    }
    posts.value = res.data.posts
    loaded.value = true
    settle(res.data)
  }
  /** Appends the page after the last one, once at a time, until the end. */
  const loadMore = async () => {
    const cursor = nextCursor.value
    if (!loaded.value || !cursor || status.value === 'loading') return
    status.value = 'loading'
    const res = await run(() =>
      $api<PostPage>('/api/post', { query: { cursor } }),
    )
    if (!res.ok) {
      status.value = 'error'
      return
    }
    const seen = new Set(posts.value.map((post) => post._id))
    posts.value = [
      ...posts.value,
      ...res.data.posts.filter((post) => !seen.has(post._id)),
    ]
    settle(res.data)
  }
  /** After an error: tries again whichever page failed. */
  const retry = () => (loaded.value ? loadMore() : loadFirstPage())

  const createNewPost = async (payload: FormData) => {
    const res = await run(
      () => $api<PostType>('/api/post', { method: 'POST', body: payload }),
      { success: 'Successfully created a new post' },
    )
    if (res.ok) posts.value = [res.data, ...posts.value]
  }
  /** Saves a caption; returns the updated post, or null when it failed. */
  const updatePost = async (
    postId: string,
    payload: UpdatePostInput,
  ): Promise<PostType | null> => {
    const res = await run(
      () =>
        $api<PostType>(`/api/post/${postId}`, { method: 'PUT', body: payload }),
      { success: 'Successfully updated post!' },
    )
    if (!res.ok) return null
    posts.value = posts.value.map((post) =>
      post._id === postId ? res.data : post,
    )
    return res.data
  }
  /** Deletes a post; true when it's gone, so the page can leave it. */
  const deletePostById = async (postId: string): Promise<boolean> => {
    const res = await run(
      () => $api(`/api/post/${postId}`, { method: 'DELETE' }),
      { success: 'Successfully deleted post!' },
    )
    if (res.ok) posts.value = posts.value.filter((post) => post._id !== postId)
    return res.ok
  }

  return {
    posts,
    nextCursor,
    status,
    loaded,
    gridScrollTop,
    loadFirstPage,
    loadMore,
    retry,
    createNewPost,
    updatePost,
    deletePostById,
  }
})
