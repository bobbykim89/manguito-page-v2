import type { PostType } from '#shared/types'
import { usePostStore } from '@/stores/postStore'
import { storeToRefs } from 'pinia'
import { computed, type MaybeRefOrGetter, toValue, watch } from 'vue'

const BASE = '/posts'

/**
 * The open post and its neighbours, derived from the shared post list.
 * Prev/next wrap around the list. An id that isn't in the loaded list alerts
 * and goes back to /posts; that check runs when a post opens or the id
 * changes, never because the list changed (so deleting the open post doesn't
 * trip it), and only in the browser.
 */
export const usePostNavigation = (postId: MaybeRefOrGetter<string>) => {
  const postStore = usePostStore()
  const alertStore = useAlertStore()
  const router = useRouter()
  const { posts } = storeToRefs(postStore)

  const index = computed(() =>
    posts.value.findIndex((post) => post._id === toValue(postId)),
  )
  const currentPost = computed<PostType | null>(
    () => posts.value[index.value] ?? null,
  )
  const neighbourUrl = (step: 1 | -1) =>
    computed(() => {
      const count = posts.value.length
      if (count === 0) return BASE
      const at = index.value === -1 ? 0 : index.value
      const target = posts.value[(at + step + count) % count]
      return target ? `${BASE}/${target._id}` : BASE
    })
  const prevUrl = neighbourUrl(-1)
  const nextUrl = neighbourUrl(1)

  watch(
    () => toValue(postId),
    () => {
      if (!import.meta.client) return
      // not loaded yet: nothing to check against
      if (posts.value.length === 0 || currentPost.value) return
      alertStore.setAlert('Error: Invalid Post ID ')
      setTimeout(() => router.push(BASE), 500)
    },
    { immediate: true },
  )

  return { currentPost, prevUrl, nextUrl }
}
