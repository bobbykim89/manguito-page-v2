import { inject } from 'vitest'

export interface ApiResult {
  status: number
  json: any
  headers: Headers
}

/** Calls the test server and parses the JSON body (or returns the raw text). */
export const api = async (
  method: string,
  path: string,
  opts: {
    body?: unknown
    token?: string
    headers?: Record<string, string>
    raw?: string | FormData
  } = {},
): Promise<ApiResult> => {
  const headers: Record<string, string> = { ...opts.headers }
  if (opts.token) headers.authorization = opts.token
  let body: BodyInit | undefined
  if (opts.raw !== undefined) {
    body = opts.raw
  } else if (opts.body !== undefined) {
    body = JSON.stringify(opts.body)
    headers['content-type'] ??= 'application/json'
  }
  const res = await fetch(`${inject('baseUrl')}${path}`, {
    method,
    headers,
    body,
  })
  const text = await res.text()
  let json: ApiResult['json']
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { status: res.status, json, headers: res.headers }
}
