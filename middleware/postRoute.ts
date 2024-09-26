import { useAlertStore, useInitStore, usePostStore } from '@/stores'
import { storeToRefs } from 'pinia'

export default defineNuxtRouteMiddleware(async () => {
  const postStore = usePostStore()
  const alertStore = useAlertStore()
  const initStore = useInitStore()
  const { currentPost } = storeToRefs(postStore)
  const { isMounted } = storeToRefs(initStore)
  if (isMounted.value === true && currentPost === null) {
    alertStore.setAlert('Unknown Post ID: redirecting to posts page')
    return navigateTo({ path: '/posts' })
  }
})
