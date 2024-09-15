import { useInitStore } from '@/stores'

export default defineNuxtPlugin({
  name: 'stores-init',
  async setup(nuxtApp) {
    const initStore = useInitStore()
    nuxtApp.hook('app:created', async () => {
      console.log('initialized plugin')
      await initStore.initStores()
    })
  },
})
