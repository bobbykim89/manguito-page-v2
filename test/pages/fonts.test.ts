import { describe, expect, it, inject } from 'vitest'
import { page } from '../utils/page'

// The fonts are self-hosted from the @fontsource packages through
// @nuxt/fonts (#27): every face is served from this site, never a font service
const baseUrl = () => inject('baseUrl')

const collectCss = async (): Promise<string> => {
  const { html } = await page('/')
  const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(
    (m) => m[1]!,
  )
  const hrefs = [
    ...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g),
    ...html.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]+rel="stylesheet"/g),
  ].map((m) => m[1]!)
  const linked = await Promise.all(
    [...new Set(hrefs)].map(async (href) =>
      (await fetch(new URL(href, baseUrl()))).text(),
    ),
  )
  return [...inline, ...linked].join('\n')
}

type Face = { family: string; weight: string; srcs: string[]; body: string }
const faces = (css: string): Face[] =>
  [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => ({
    family: (body!.match(/font-family:\s*([^;]+)/)?.[1] ?? '')
      .replace(/["']/g, '')
      .trim(),
    weight: (body!.match(/font-weight:\s*([^;]+)/)?.[1] ?? '').trim(),
    srcs: [...body!.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map(
      (m) => m[1]!,
    ),
    body: body!,
  }))

describe('fonts', () => {
  it('scans some CSS', async () => {
    expect((await collectCss()).length).toBeGreaterThan(0)
  })

  it('serves Inter in every weight the site uses, and Permanent Marker', async () => {
    const all = faces(await collectCss())
    for (const weight of ['300', '400', '600', '700']) {
      expect(
        all.some(
          (f) => f.family === 'Inter' && f.weight.split(/\s+/).includes(weight),
        ),
        `Inter ${weight}`,
      ).toBe(true)
    }
    expect(
      all.some((f) => f.family === 'Permanent Marker' && f.weight === '400'),
    ).toBe(true)
  })

  it('loads every face from the site itself', async () => {
    const ours = faces(await collectCss()).filter((f) =>
      ['Inter', 'Permanent Marker'].includes(f.family),
    )
    expect(ours.length).toBeGreaterThan(0)
    for (const face of ours) {
      // a path on this site (the module serves them under /_nuxt/fonts/), never another host
      for (const src of face.srcs) expect(src).toMatch(/^\/(?!\/)/)
    }
    for (const family of ['Inter', 'Permanent Marker']) {
      const src = ours.find((f) => f.family === family)?.srcs[0]
      expect(src, family).toBeDefined()
      const res = await fetch(new URL(src!, baseUrl()))
      expect(res.status, src).toBe(200)
      expect(res.headers.get('content-type') ?? '').toMatch(/font/)
    }
  })

  it('has a size-adjusted fallback for Inter, so text does not shift', async () => {
    const fallback = faces(await collectCss()).find((f) =>
      f.family.includes('Inter Fallback'),
    )
    expect(fallback?.body).toMatch(/size-adjust/)
  })
})
