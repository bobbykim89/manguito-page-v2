import type { PostType, PostWithNeighbours } from '#shared/types'
import { computed, type MaybeRefOrGetter, ref, toValue } from 'vue'

/**
 * The open post and its prev/next links, from GET /api/post/:id (rendered on
 * the server). Prev/next come from the server, so they don't depend on how
 * much of the grid has loaded, and they wrap at both ends.
 *
 * An unknown or malformed id throws a fatal 404, so the error page shows
 * "This page doesn't exist" with a real 404 status.
 */
export const usePost = async (postId: MaybeRefOrGetter<string>) => {
  const { data, error } = await useApi<PostWithNeighbours>(
    () => `/api/post/${toValue(postId)}`,
  )
  if (error.value || !data.value) {
    const status = error.value?.statusCode ?? 404
    if (status === 400 || status === 404)
      throw createError({
        statusCode: 404,
        statusMessage: "This post doesn't exist.",
        fatal: true,
      })
    throw createError({ statusCode: status || 500, fatal: true })
  }
  const loaded = data.value
  /** The page replaces this after saving an edit. */
  const post = ref<PostType>(loaded.post)
  const prevUrl = computed(() => `/posts/${loaded.prevId}`)
  const nextUrl = computed(() => `/posts/${loaded.nextId}`)
  return { post, prevUrl, nextUrl }
}
