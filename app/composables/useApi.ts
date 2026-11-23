/**
 * useFetch through $apiFetch: sends the session token and gives the unwrapped
 * `data`. Its error is a NuxtError whose `.data` is the error envelope (the
 * ApiError class doesn't survive the server-to-browser payload), so read
 * `error.value.data.error.code`, or pass it to useErrorCheck.
 *
 * Built with createUseFetch, so Nuxt keys each call site separately: two
 * pages loading the same URL don't share (or refresh) each other's data.
 */
export const useApi = createUseFetch(() => ({
  $fetch: useNuxtApp().$apiFetch,
}))
