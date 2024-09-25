import { useAlertStore, useInitStore, useUserStore } from '@/stores'
import { storeToRefs } from 'pinia'

export default defineNuxtRouteMiddleware(async () => {
  const userStore = useUserStore()
  const alertStore = useAlertStore()
  const initStore = useInitStore()
  const { isMounted } = storeToRefs(initStore)
  const { isAuthenticated } = userStore.getCurrentAuthInfo
  if (isMounted.value === true && isAuthenticated) {
    alertStore.setAlert('Guest only route: redirecting to main page')
    return navigateTo({ path: '/' })
  }
})
