import type { ApiResponse } from '#shared/types'
import { defineEventHandler, type H3Event, setResponseStatus } from 'h3'
import { toApiFailure } from './apiError.util'

/** A step that runs before the handler; it throws to refuse the request. */
export type ApiMiddleware = (e: H3Event) => void | Promise<void>

/**
 * An /api route: runs each middleware in order, then the handler, and answers
 * `{ ok: true, data }`, or `{ ok: false, error }` for anything thrown.
 */
export const defineApiRoute = <T>(route: {
  middleware?: ApiMiddleware[]
  handler: (e: H3Event) => T | Promise<T>
  status?: 200 | 201
}) =>
  defineEventHandler(async (e): Promise<ApiResponse<Awaited<T>>> => {
    try {
      for (const step of route.middleware ?? []) await step(e)
      const data = await route.handler(e)
      setResponseStatus(e, route.status ?? 200)
      return { ok: true, data: (data ?? null) as Awaited<T> }
    } catch (err) {
      const failure = toApiFailure(err)
      setResponseStatus(e, failure.status)
      return failure.body
    }
  })
