import type { FetchContext, FetchHook, FetchOptions } from 'ofetch'
import { useAuthToken } from '@/composables/useAuthToken'
import { toApiError } from '@/utils/apiError'

type Hooks<C extends FetchContext = FetchContext> =
  FetchHook<C> | FetchHook<C>[] | undefined

/** The plugin's own hook first, then whatever the caller passed. */
const withHook = <C extends FetchContext>(
  own: FetchHook<C>,
  caller: Hooks<C>,
): FetchHook<C>[] => [
  own,
  ...(caller === undefined ? [] : Array.isArray(caller) ? caller : [caller]),
]

/**
 * The one way the app calls /api:
 * - `$apiFetch` adds the session token and unwraps `{ ok: true, data }`; its
 *   failures keep the error envelope as `.data` (useApi relies on that);
 * - `$api` does the same and throws an ApiError on failure.
 * A caller's own onRequest/onResponse run after these, never instead.
 */
export default defineNuxtPlugin({
  name: 'api',
  setup() {
    // one shared cookie ref per app instance, captured while in context
    const token = useAuthToken()

    const addToken: FetchHook = ({ options }) => {
      if (token.value) options.headers.set('Authorization', token.value)
    }
    const unwrap: FetchHook = ({ response }) => {
      if (!response) return
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
    }

    const baseFetch = $fetch.create({}) as unknown as (
      url: string,
      opts: FetchOptions<'json'>,
    ) => Promise<unknown>
    const apiFetch = ((url: string, opts: FetchOptions = {}) =>
      baseFetch(url, {
        ...opts,
        onRequest: withHook(addToken, opts.onRequest as Hooks),
        onResponse: withHook(unwrap, opts.onResponse as Hooks),
      } as FetchOptions<'json'>)) as unknown as typeof $fetch

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
