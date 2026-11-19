import { describe, expect, inject, it } from 'vitest'

/** Requests a page the way a browser does, without following redirects. */
const page = async (path: string) => {
  const res = await fetch(`${inject('baseUrl')}${path}`, {
    headers: { accept: 'text/html' },
    redirect: 'manual',
  })
  return { status: res.status, html: await res.text() }
}

describe('server-rendered pages', () => {
  it.each([
    ['/', '<title>ManguitoPage</title>'],
    ['/about', 'About | Manguito Page'],
    ['/posts', '<title>'],
  ])('renders %s', async (path, expected) => {
    const res = await page(path)
    expect(res.status).toBe(200)
    expect(res.html).toContain(expected)
    // error.vue uses this title for every error, whatever the status
    expect(res.html).not.toContain('404 | Manguito Page')
  })
})
