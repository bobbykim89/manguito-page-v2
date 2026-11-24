import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// These hide a hydration mismatch instead of fixing it. Fix the cause: show
// dates with <LocalDate>, and don't let anything that differs between server
// and browser (feature detection, Date, the timezone) decide what renders.
const suppression = /<ClientOnly\b|\bdata-allow-mismatch\b/

describe('hydration suppressions', () => {
  it('uses no <ClientOnly> or data-allow-mismatch in app/', () => {
    const hits: string[] = []
    for (const file of globSync('app/**/*.{vue,ts}')) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (suppression.test(line)) hits.push(`${file}:${i + 1}`)
        })
    }
    expect(hits).toEqual([])
  })
})
