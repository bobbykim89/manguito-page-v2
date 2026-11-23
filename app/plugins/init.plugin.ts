import { useUserStore } from '@/stores'

/**
 * Checks the session once at startup. Posts aren't loaded here: each page
 * that shows them asks for what it needs.
 */
export const startStores = async ({
  userStore,
}: {
  userStore: ReturnType<typeof useUserStore>
}): Promise<void> => {
  await userStore.ensureAuth()
}

export default defineNuxtPlugin({
  name: 'stores-init',
  // the stores call the API through the api plugin's $api / $apiFetch
  dependsOn: ['api'],
  setup(nuxtApp) {
    // resolved here, in the plugin's context, not inside the hook
    const stores = { userStore: useUserStore() }
    nuxtApp.hook('app:created', () => startStores(stores))
  },
})
