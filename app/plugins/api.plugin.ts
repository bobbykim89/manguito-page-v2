import type { FetchOptions } from 'ofetch'
import { useAuthToken } from '@/composables/useAuthToken'
import { toApiError } from '@/utils/apiError'

/**
 * The one way the app calls /api:
 * - `$apiFetch` adds the session token and unwraps `{ ok: true, data }`; its
 *   failures keep the error envelope as `.data` (useApi relies on that);
 * - `$api` does the same and throws an ApiError on failure.
 */
export default defineNuxtPlugin({
  name: 'api',
  setup() {
    // one shared cookie ref per app instance, captured while in context
    const token = useAuthToken()

    const apiFetch = $fetch.create({
      onRequest({ options }) {
        if (token.value) options.headers.set('Authorization', token.value)
      },
      onResponse({ response }) {
        const body: unknown = response._data
        if (
          body &&
          typeof body === 'object' &&
          'ok' in body &&
          body.ok === true &&
          'data' in body
        ) {
          response._data = body.data
        }
      },
    })

    const api = async <T>(url: string, opts?: FetchOptions<'json'>) => {
      try {
        return await (
          apiFetch as (u: string, o?: FetchOptions<'json'>) => Promise<T>
        )(url, opts)
      } catch (err) {
        throw toApiError(err)
      }
    }

    return { provide: { api, apiFetch } }
  },
})
