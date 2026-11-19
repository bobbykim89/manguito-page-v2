import type { CookieRef } from '#app'
import { useCookie, useNuxtApp } from '#imports'

declare module '#app' {
  interface NuxtApp {
    _authTokenCookie?: CookieRef<string | null | undefined>
  }
}

/**
 * The access_token cookie, shared by everything in this app instance.
 * Separate useCookie refs for the same cookie only sync asynchronously, so the
 * stores, route guards and tests must read the same ref: otherwise a read
 * right after a write sees the old value.
 */
export const useAuthToken = () => {
  const nuxtApp = useNuxtApp()
  nuxtApp._authTokenCookie ??= useCookie<string | null | undefined>(
    'access_token',
    {
      maxAge: 604800,
      sameSite: true,
    },
  )
  return nuxtApp._authTokenCookie
}
