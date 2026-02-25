import { useAlertStore, useInitStore, useUserStore } from '@/stores'
import { storeToRefs } from 'pinia'

export default defineNuxtRouteMiddleware(async () => {
  const userStore = useUserStore()
  const alertStore = useAlertStore()
  const initStore = useInitStore()
  const { isMounted } = storeToRefs(initStore)
  const { isAuthenticated, currentUser } = userStore.getCurrentAuthInfo
  if (isMounted.value === true && !isAuthenticated) {
    alertStore.setAlert('Admin only route: redirecting to main page')
    return navigateTo({ path: '/' })
  }
  if (isMounted.value === true && currentUser?.role !== 'ADMIN') {
    alertStore.setAlert('Admin only route: redirecting to main page')
    return navigateTo({ path: '/' })
  }
})
