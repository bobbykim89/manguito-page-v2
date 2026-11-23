import { type UpdatePostInput } from '#shared/dto/post'
import type { PostType } from '#shared/types'
import { useApiAction } from '@/composables/useApiAction'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * The post list every page shares, and the actions that change it. The
 * server decides who may change what; a refusal comes back as an alert.
 */
export const usePostStore = defineStore('post', () => {
  const { $api } = useNuxtApp()
  const { run } = useApiAction()

  // POST: states
  const posts = ref<PostType[]>([])

  // POST: getters
  const getRecentPosts = computed<PostType[]>(() => posts.value.slice(0, 7))

  // POST: actions
  const getAllPosts = async () => {
    const { data, error } = await useApi<PostType[]>('/api/post')
    if (error.value) {
      // a failed load alerts (and ends a dead session) like any action
      await run(() => Promise.reject(error.value))
      return
    }
    posts.value = data.value ?? []
  }
  const createNewPost = async (payload: FormData) => {
    const res = await run(
      () => $api<PostType>('/api/post', { method: 'POST', body: payload }),
      { success: 'Successfully created a new post' },
    )
    if (res.ok) posts.value = [res.data, ...posts.value]
  }
  const updatePost = async (postId: string, payload: UpdatePostInput) => {
    const res = await run(
      () =>
        $api<PostType>(`/api/post/${postId}`, { method: 'PUT', body: payload }),
      { success: 'Successfully updated post!' },
    )
    if (res.ok) {
      posts.value = posts.value.map((post) =>
        post._id === postId ? res.data : post,
      )
    }
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
    getRecentPosts,
    getAllPosts,
    createNewPost,
    updatePost,
    deletePostById,
  }
})
