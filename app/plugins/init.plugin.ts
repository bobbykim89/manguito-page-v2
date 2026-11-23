import { usePostStore, useUserStore } from '@/stores'

/**
 * Loads the post list and checks the session at the same time; neither
 * depends on the other, and the server render waits for both.
 */
export const startStores = async ({
  postStore,
  userStore,
}: {
  postStore: ReturnType<typeof usePostStore>
  userStore: ReturnType<typeof useUserStore>
}): Promise<void> => {
  await Promise.all([postStore.getAllPosts(), userStore.ensureAuth()])
}

export default defineNuxtPlugin({
  name: 'stores-init',
  // the stores call the API through the api plugin's $api / $apiFetch
  dependsOn: ['api'],
  setup(nuxtApp) {
    // resolved here, in the plugin's context, not inside the hook
    const stores = { postStore: usePostStore(), userStore: useUserStore() }
    nuxtApp.hook('app:created', () => startStores(stores))
  },
})
