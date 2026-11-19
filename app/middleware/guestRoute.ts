import { useAlertStore, useUserStore } from '@/stores'

export default defineNuxtRouteMiddleware(async () => {
  const userStore = useUserStore()
  const alertStore = useAlertStore()
  // runs on the server render too, so wait for the session check
  await userStore.ensureAuth()
  const { isAuthenticated } = userStore.getCurrentAuthInfo
  if (isAuthenticated) {
    alertStore.setAlert('Guest only route: redirecting to main page')
    return navigateTo({ path: '/' })
  }
})
