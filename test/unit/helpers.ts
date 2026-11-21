import {
  API_ERROR_STATUS,
  type ApiErrorCode,
  type ApiErrorDetail,
  type ApiFailure,
  type ApiSuccess,
} from '#shared/types'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { type EventHandler, type H3Event, setResponseStatus } from 'h3'
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

/** A mocked route's success body, as the real API sends it. */
export const okEnvelope = <T>(data: T): ApiSuccess<T> => ({ ok: true, data })

/** A mocked route's error body, with the status that goes with the code. */
export const failEnvelope = (
  event: H3Event,
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetail[],
): ApiFailure => {
  setResponseStatus(event, API_ERROR_STATUS[code])
  return {
    ok: false,
    error: details ? { code, message, details } : { code, message },
  }
}
