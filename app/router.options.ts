import type { RouterConfig } from '@nuxt/schema'
import { usePostStore } from '@/stores'
import { scrollTarget } from '@/utils/gridScroll'
import { START_LOCATION } from 'vue-router'

/**
 * Nuxt's default scroll behaviour (nuxt/dist/pages/runtime/router.options.js)
 * with one added rule, in `scrollTarget`: coming to the grid from a post page
 * returns to where the grid was. Like the default, it scrolls only after the
 * new page has loaded and its transition has finished.
 */
export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    const nuxtApp = useNuxtApp()
    const router = useRouter()
    // resolved now, synchronously, not inside the promise below
    const postStore = usePostStore()
    // the default reads router.options.scrollBehaviorType, which this app
    // doesn't set
    const hashBehaviour: ScrollBehavior = 'auto'

    const marginTop = (hash: string): number => {
      const el = document.getElementById(hash.slice(1))
      if (!el) return 0
      return (
        (Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0) +
        (Number.parseFloat(
          getComputedStyle(document.documentElement).scrollPaddingTop,
        ) || 0)
      )
    }
    const position = () => {
      const target = scrollTarget(
        to,
        from,
        savedPosition,
        postStore.gridScrollTop,
      )
      return 'el' in target
        ? { ...target, top: marginTop(target.el), behavior: hashBehaviour }
        : target
    }

    // the same page with only the hash changing
    if (to.path.replace(/\/$/, '') === from.path.replace(/\/$/, '')) {
      if (from.hash && !to.hash) return savedPosition ?? { left: 0, top: 0 }
      if (to.hash)
        return { el: to.hash, top: marginTop(to.hash), behavior: hashBehaviour }
      return false
    }
    const scrollToTop =
      typeof to.meta.scrollToTop === 'function'
        ? to.meta.scrollToTop(to, from)
        : to.meta.scrollToTop
    if (scrollToTop === false) return false
    if (from === START_LOCATION) return position()

    return new Promise((resolve) => {
      const doScroll = () => {
        requestAnimationFrame(() => {
          // a later navigation won
          if (router.currentRoute.value.fullPath !== to.fullPath) {
            resolve(false)
            return
          }
          resolve(position())
        })
      }
      nuxtApp.hooks.hookOnce('page:loading:end', () => {
        const transition = (
          nuxtApp as unknown as { '~transitionPromise'?: Promise<void> }
        )['~transitionPromise']
        if (transition) transition.then(doScroll)
        else doScroll()
      })
    })
  },
}
