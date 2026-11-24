import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Tailwind 4 builds font-* utilities (and the base font) from --font-*; the
// Tailwind 3 names (--font-family-*) generate nothing, so the fonts never
// loaded (#27)
const css = readFileSync('app/assets/css/styles.css', 'utf8')
const value = (name: string) =>
  css.match(new RegExp(`--font-${name}:\\s*([^;]+);`))?.[1]?.trim()

describe('theme fonts', () => {
  it('makes Inter the base font', () => {
    expect(value('sans')).toMatch(/^Inter,/)
  })

  it('keeps font-inter and font-marker', () => {
    expect(value('inter')).toMatch(/^Inter,/)
    expect(value('marker')).toMatch(/^'Permanent Marker',/)
  })

  it('uses no Tailwind 3 font names', () => {
    expect(css).not.toContain('--font-family-')
  })
})

// The no-network guarantee must not rest on upstream defaults: with
// `npm.remote` left to unifont it is true, and installed packages would be
// fetched from a CDN at build (still self-hosted, so the page test can't see it)
describe('font providers', () => {
  const config = readFileSync('nuxt.config.ts', 'utf8')
  const fonts = config.match(/\n {2}fonts: \{([\s\S]*?)\n {2}\},\n/)?.[1] ?? ''

  it('uses only the npm provider', () => {
    expect(fonts).toMatch(/\n {4}provider: 'npm',/)
  })

  it('never lets the npm provider fetch remotely', () => {
    expect(fonts).toMatch(/\n {4}npm: \{ remote: false \},/)
  })
})
