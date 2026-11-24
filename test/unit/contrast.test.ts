import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

// The colours come from the theme's tokens (--color-x: var(--mcl-x, #default));
// app/assets/css/styles.css overrides some of them on :root. A failing pair
// here fails WCAG 2.0 AA 1.4.3 for every visitor.
const themeCss = readFileSync(
  createRequire(import.meta.url).resolve(
    '@bobbykim/manguito-theme/mcl-theme-v4.css',
  ),
  'utf8',
)
const appCss = readFileSync('app/assets/css/styles.css', 'utf8')

const tokens = new Map<string, string>()
for (const [, name, value] of themeCss.matchAll(
  /--color-[a-z0-9-]+:\s*var\(--mcl-([a-z0-9-]+),\s*(#[0-9a-f]{6})\)/gi,
)) {
  tokens.set(name!, value!.toLowerCase())
}
const root = appCss.match(/:root\s*\{([^}]*)\}/)?.[1] ?? ''
for (const [, name, value] of root.matchAll(
  /--mcl-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi,
)) {
  tokens.set(name!, value!.toLowerCase())
}

const hex = (colour: string): string => {
  if (colour.startsWith('#')) return colour
  const value = tokens.get(colour)
  if (!value) throw new Error(`unknown colour token: ${colour}`)
  return value
}

const luminance = (colour: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(colour.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

/** WCAG 2.0 contrast ratio, unrounded. */
const contrast = (fg: string, bg: string): number => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
  return (hi! + 0.05) / (lo! + 0.05)
}

type Pair = [name: string, fg: string, bg: string, large: boolean]
// one row per text/background pair the site renders; add a row with every new pair
const pairs: Pair[] = [
  ['Hero link, pink on page', 'primary', 'light-1', false],
  ['Home story text, white on pink', '#ffffff', 'primary', false],
  ['pink buttons', 'light-1', 'primary', false],
  ['login links on card', 'primary', 'light-1', false],
  ['header IT', 'primary', 'light-1', true],
  ['footer IT', 'primary', 'dark-3', true],
  ['alert success', 'light-1', 'success', false],
  ['alert danger', 'light-1', 'danger', false],
  ['alert info', 'light-1', 'info', false],
  ['Cancel buttons', 'dark-4', 'warning', false],
  ['muted text on page', 'dark-2', 'light-1', false],
  ['muted text on post card', 'dark-2', 'light-2', false],
  ['muted text on admin rows', 'dark-2', 'light-3', false],
  ['comment author/date', 'dark-2', 'light-4', false],
  ['mobile account bar', 'light-1', 'dark-2', false],
  ['error card', 'dark-3', 'light-3', false],
  ['About button', 'light-3', 'dark-3', false],
  ['admin sidebar', 'light-1', 'dark-3', false],
  // mcl-forms' invalid-feedback is text-xs text-danger on the card
  ['form error on auth card', 'danger', 'light-3', false],
  ['form error on comment card', 'danger', 'light-4', false],
]

describe('colour contrast (WCAG 2.0 AA)', () => {
  it('has pairs to check', () => expect(pairs.length).toBeGreaterThan(0))

  it('reads the override', () => expect(hex('primary')).toBe('#d02b78'))

  it.each(pairs)('%s meets AA', (_name, fg, bg, large) => {
    expect(contrast(hex(fg), hex(bg))).toBeGreaterThanOrEqual(large ? 3 : 4.5)
  })
})
