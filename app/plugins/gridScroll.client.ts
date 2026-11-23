import { usePostStore } from '@/stores'
import { isGridPath, isPostPath } from '@/utils/gridScroll'

/**
 * Remembers how far down the grid was when a post is opened from it, so
 * coming back from that post (Back, the X, the backdrop) returns there; see
 * app/router.options.ts. A global guard, so it doesn't depend on how the grid
 * page was mounted.
 */
export default defineNuxtPlugin({
  name: 'grid-scroll',
  // the store's actions use the api plugin's $api
  dependsOn: ['api'],
  setup() {
    const postStore = usePostStore()
    useRouter().beforeEach((to, from) => {
      if (isGridPath(from.path) && isPostPath(to.path))
        postStore.gridScrollTop = window.scrollY
    })
  },
})
