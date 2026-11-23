import type { CommentType } from '#shared/types'
import { type MaybeRefOrGetter, toValue } from 'vue'

/**
 * One post's comments, and the actions on them. Each action reloads the list
 * when it succeeds. Awaits the first load, so a server render has the list.
 */
export const usePostComments = async (postId: MaybeRefOrGetter<string>) => {
  const { $api } = useNuxtApp()
  const { run } = useApiAction()
  const { data: comments, refresh } = await useApi<CommentType[]>(
    () => `/api/comment/${toValue(postId)}`,
  )

  const addComment = async (text: string) => {
    const res = await run(
      () =>
        $api(`/api/comment/${toValue(postId)}`, {
          method: 'POST',
          body: { text },
        }),
      { success: 'Successfully created a comment!' },
    )
    if (res.ok) await refresh()
  }
  const removeComment = async (id: string) => {
    const res = await run(
      () => $api(`/api/comment/${id}`, { method: 'DELETE' }),
      { success: 'Successfully deleted a comment!' },
    )
    if (res.ok) await refresh()
  }

  return { comments, addComment, removeComment }
}
