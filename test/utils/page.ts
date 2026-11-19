import { inject } from 'vitest'

/** Requests a page the way a browser does, without following redirects. */
export const page = async (
  path: string,
  token?: string,
): Promise<{
  status: number
  location: string | null
  html: string
  setCookie: string | null
}> => {
  const headers: Record<string, string> = { accept: 'text/html' }
  if (token) headers.cookie = `access_token=${encodeURIComponent(token)}`
  const res = await fetch(`${inject('baseUrl')}${path}`, {
    headers,
    redirect: 'manual',
  })
  return {
    status: res.status,
    location: res.headers.get('location'),
    html: await res.text(),
    setCookie: res.headers.get('set-cookie'),
  }
}
