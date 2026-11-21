import { useAlertStore, useUserStore } from '@/stores'

/**
 * For page actions that call $api: alerts why the call failed, and ends the
 * session first when the server says it's gone (UNAUTHENTICATED).
 */
export const useReportApiError = () => {
  const alertStore = useAlertStore()
  const userStore = useUserStore()
  const { extractMessage, isAuthError } = useErrorCheck()
  return (err: unknown) => {
    if (isAuthError(err)) userStore.expireSession()
    alertStore.setAlert(extractMessage(err))
  }
}
