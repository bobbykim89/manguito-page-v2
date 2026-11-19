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
