import { useInitStore } from '~/app/stores'

export default defineNuxtPlugin({
  name: 'stores-init',
  async setup(nuxtApp) {
    const initStore = useInitStore()
    nuxtApp.hook('app:created', async () => {
      await initStore.initStores()
    })
  },
})
