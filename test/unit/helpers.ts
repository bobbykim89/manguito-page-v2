import { registerEndpoint } from '@nuxt/test-utils/runtime'
import type { EventHandler } from 'h3'
import { createPinia, setActivePinia } from 'pinia'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** Fresh Pinia state and no session cookie. Call in beforeEach. */
export const resetState = () => {
  setActivePinia(createPinia())
  useAuthToken().value = null
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
