import { useAlertStore } from '@/stores/alertStore'
import { useUserStore } from '@/stores/userStore'

export interface RunOptions {
  /** Shown as a success alert when the call succeeds. */
  success?: string
  /** A dead session logs out without an alert (the startup check only). */
  quiet?: boolean
}

export type RunResult<T> = { ok: true; data: T } | { ok: false }

/**
 * The one way to run an API action: it shows the success alert, or on
 * failure alerts the server's message, ending the session first when the
 * server says it's gone (UNAUTHENTICATED). It never throws.
 *
 * The stores are resolved here, synchronously, never after an await: a store
 * looked up from an async continuation could belong to another SSR request.
 * Inside userStore's own setup this returns the store being built, since
 * Pinia registers a store before running its setup.
 */
export const useApiAction = () => {
  const alertStore = useAlertStore()
  const userStore = useUserStore()
  const { extractMessage, isAuthError } = useErrorCheck()

  const run = async <T>(
    call: () => Promise<T>,
    opts: RunOptions = {},
  ): Promise<RunResult<T>> => {
    try {
      const data = await call()
      if (opts.success) alertStore.setAlert(opts.success, 'success')
      return { ok: true, data }
    } catch (err) {
      if (isAuthError(err)) {
        userStore.expireSession()
        if (opts.quiet) return { ok: false }
      }
      alertStore.setAlert(extractMessage(err))
      return { ok: false }
    }
  }

  return { run }
}
