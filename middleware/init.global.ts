import { useInitStore } from '@/stores'

export default defineNuxtRouteMiddleware(async () => {
  const initStore = useInitStore()
  await initStore.initStores()
})
