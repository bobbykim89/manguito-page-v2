import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// WCAG 2.0 2.2.2: decoration that moves on its own must stop within 5 s, and
// nothing decorative moves for a visitor who asks for reduced motion (#14)
const css = readFileSync('app/assets/css/styles.css', 'utf8')
const seconds = (t: string) =>
  t.endsWith('ms') ? parseFloat(t) / 1000 : parseFloat(t)

describe('motion', () => {
  const animations = [...css.matchAll(/--animate-([a-z-]+):\s*([^;]+);/g)]

  it('defines the app animations', () => {
    expect(animations.map(([, name]) => name)).toEqual(
      expect.arrayContaining(['balls', 'bounce-settle']),
    )
  })

  it.each(animations.map(([, name, value]) => [name!, value!]))(
    '--animate-%s ends within 5 seconds',
    (_name, value) => {
      expect(value).not.toMatch(/\binfinite\b/)
      const times = value.match(/\d*\.?\d+m?s\b/g) ?? []
      const [duration = 0, delay = 0] = times.map(seconds)
      const count = Number(
        value.split(/\s+/).find((part) => /^\d*\.?\d+$/.test(part)) ?? 1,
      )
      expect(delay + duration * count).toBeLessThanOrEqual(5)
    },
  )

  it('stops decoration when reduced motion is asked for', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })
})
