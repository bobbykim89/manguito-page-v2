import { describe, expect, it } from 'vitest'
import { page } from '../utils/page'

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

describe('error page', () => {
  it('shows a 404 for an unknown route', async () => {
    const res = await page('/does-not-exist')
    expect(res.status).toBe(404)
    // Vue escapes the apostrophe in server-rendered text
    expect(res.html).toMatch(/This page doesn(?:'|&#39;)t exist/)
    expect(res.html).toContain('<title>404 | Manguito Page')
  })
})
