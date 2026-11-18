import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { setResponseStatus, type EventHandler, type H3Event } from 'h3'
import { createPinia, setActivePinia } from 'pinia'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** Fresh Pinia state and no session cookie. Call in beforeEach. */
export const resetState = () => {
  setActivePinia(createPinia())
  useAuthToken().value = null
}

/** A success envelope (the API shape planned in #15). */
export const ok = <T>(data: T) => ({ ok: true as const, data })

/** Sets the status and returns a failure envelope (the API shape planned in #15). */
export const fail = (
  event: H3Event,
  status: number,
  code: string,
  message: string,
) => {
  setResponseStatus(event, status)
  return { ok: false as const, error: { code, message } }
}

const cleanups: Array<() => void> = []

/** Mocks one API route for the current test; undo with clearApiMocks(). */
export const mockApi = (method: Method, url: string, handler: EventHandler) => {
  cleanups.push(registerEndpoint(url, { method, handler }))
}

/** Removes every route mocked with mockApi. Call in afterEach. */
export const clearApiMocks = () => {
  while (cleanups.length) cleanups.pop()!()
}
