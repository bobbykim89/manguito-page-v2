import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { AxeResults, RunOptions } from 'axe-core'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { deleteUser, insertUser } from '../utils/auth'
import { clearContent, insertComment, insertPost } from '../utils/content'
import { page } from '../utils/page'

// axe-core on the server-rendered HTML of every page (WCAG 2.0, #14). jsdom has
// no layout and loads no CSS, so colour contrast is checked separately
// (test/unit/contrast.test.ts) and in the browser walk.
const axeSource = readFileSync(
  createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
  'utf8',
)

export const scan = async (
  html: string,
  runOnly: RunOptions['runOnly'],
): Promise<AxeResults['violations']> => {
  const dom = new JSDOM(html, { runScripts: 'outside-only' })
  try {
    dom.window.eval(axeSource)
    const axe = (dom.window as unknown as { axe: typeof import('axe-core') })
      .axe
    const results = await axe.run(dom.window.document, {
      runOnly,
      rules: { 'color-contrast': { enabled: false } },
    })
    return results.violations
  } finally {
    dom.window.close()
  }
}

type Who = 'out' | 'USER' | 'ADMIN'
// POST is replaced by a seeded post's id
export const matrix: Array<[path: string, who: Who, status: number]> = [
  ['/', 'out', 200],
  ['/posts', 'out', 200],
  ['/posts/POST', 'out', 200],
  ['/about', 'out', 200],
  ['/auth/login', 'out', 200],
  ['/auth/signup', 'out', 200],
  ['/auth/request', 'out', 200],
  ['/auth/reset-password?user=x&token=y', 'out', 200],
  ['/no-such-page', 'out', 404],
  ['/posts/not-an-id', 'out', 404],
  ['/', 'USER', 200],
  ['/posts', 'USER', 200],
  ['/posts/POST', 'USER', 200],
  ['/admin/request', 'USER', 200],
  ['/', 'ADMIN', 200],
  ['/posts/POST', 'ADMIN', 200],
  ['/admin', 'ADMIN', 200],
  ['/admin/posts', 'ADMIN', 200],
  ['/admin/comments', 'ADMIN', 200],
  ['/admin/users', 'ADMIN', 200],
]

const seeded: { user?: string; admin?: string; post?: string } = {}
const tokens: Partial<Record<Who, string>> = {}

export const render = async (path: string, who: Who) => {
  const res = await page(
    path.replace('POST', seeded.post ?? 'POST'),
    who === 'out' ? undefined : tokens[who],
  )
  return res
}

beforeAll(async () => {
  const user = await insertUser('USER')
  const admin = await insertUser('ADMIN')
  Object.assign(seeded, { user: user.id, admin: admin.id })
  Object.assign(tokens, { USER: user.token, ADMIN: admin.token })
  seeded.post = await insertPost(admin.id)
  await insertPost(admin.id)
  await insertPost(admin.id)
  await insertComment(user.id, seeded.post)
})

afterAll(async () => {
  await clearContent()
  if (seeded.user) await deleteUser(seeded.user)
  if (seeded.admin) await deleteUser(seeded.admin)
})

describe('page structure', () => {
  it('scans something', () => expect(matrix.length).toBeGreaterThan(10))

  it.each(matrix)(
    '%s (%s) has one main, one h1 and a skip link',
    async (path, who, status) => {
      const res = await render(path, who)
      expect(res.status).toBe(status)
      const violations = await scan(res.html, {
        type: 'rule',
        values: ['landmark-one-main', 'page-has-heading-one', 'bypass'],
      })
      expect(violations.map((v) => v.id)).toEqual([])
      const doc = new JSDOM(res.html).window.document
      expect(doc.querySelectorAll('main#main')).toHaveLength(1)
      expect(doc.querySelectorAll('h1')).toHaveLength(1)
      const first = doc.querySelector('#__nuxt a[href], #__nuxt button')
      expect(first?.getAttribute('href')).toBe('#main')
      expect(first?.textContent?.trim()).toBe('Skip to content')
    },
  )
})
