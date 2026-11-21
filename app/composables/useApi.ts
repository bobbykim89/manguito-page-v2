import type { UseFetchOptions } from '#app'

/**
 * useFetch through $apiFetch: sends the session token and gives the unwrapped
 * `data`. Its error is a NuxtError whose `.data` is the error envelope (the
 * ApiError class doesn't survive the server-to-browser payload), so read
 * `error.value.data.error.code`, or pass it to useErrorCheck.
 */
export const useApi = <T>(
  url: string | (() => string),
  opts: UseFetchOptions<T> = {},
) =>
  useFetch(url, {
    ...opts,
    $fetch: useNuxtApp().$apiFetch as typeof $fetch,
  })
