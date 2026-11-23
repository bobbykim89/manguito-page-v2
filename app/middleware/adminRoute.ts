import { useAlertStore, useUserStore } from '@/stores'

export default defineNuxtRouteMiddleware(async () => {
  const userStore = useUserStore()
  const alertStore = useAlertStore()
  // runs on the server render too, so wait for the session check
  await userStore.ensureAuth()
  const { isAuthenticated, isAdmin } = userStore
  if (!isAuthenticated && userStore.sessionExpired) {
    return navigateTo({ path: '/auth/login', query: { reason: 'expired' } })
  }
  if (!isAuthenticated || !isAdmin) {
    alertStore.setAlert('Admin only route: redirecting to main page')
    return navigateTo({ path: '/' })
  }
})
