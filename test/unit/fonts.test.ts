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
