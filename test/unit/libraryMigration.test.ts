import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Old @bobbykim/manguito-theme APIs. Vue passes unknown props through without
// an error and typecheck doesn't flag them, so these would fail silently.
const banned: Array<[RegExp, string]> = [
  [/:?class-name=/, 'class-name → custom-class (1.0)'],
  [/\bis-required\b/, 'is-required → required (1.0)'],
  [/\s:?display-[a-z]+/, 'display-* → show-* (1.0)'],
  [
    /v-collapse\b|vCollapse/,
    'v-collapse is sunsetted: AccordionGroup + useCollapseTrigger',
  ],
  [
    /v-toggle\b|vToggle/,
    'v-toggle is deprecated: open dialogs through their ref',
  ],
  [/\baccordion=/, 'accordion= is ignored: wrap panels in <AccordionGroup>'],
  [/bg-opacity-/, 'bg-opacity-* only affects mcl-bg-*: use bg-<color>/<n>'],
  [
    /\bno-(backdrop|header)\b/,
    'no-backdrop/no-header → show-backdrop/show-header (1.0)',
  ],
  [/\btextcolor=/, 'textcolor → text-color (1.0)'],
  [/\bbtn-no-ring\b/, 'btn-no-ring must not hide the focus ring'],
  [/\blabel-for=/, 'MclFormGroup label-for → field-id (mcl-forms 0.12)'],
  // the theme's --spacing-{xs..3xl} tokens win over Tailwind's container sizes,
  // so max-w-md is 2rem, not 28rem: write the width out, e.g. max-w-[28rem]
  [
    /\bmax-w-(3xs|2xs|xs|sm|md|lg|xl|[2-7]xl)\b/,
    'max-w-<size> resolves to the theme spacing scale: use max-w-[<n>rem]',
  ],
  // WCAG 2.0 AA contrast (#14), checked in contrast.test.ts
  [
    /\btext-dark-1\b/,
    'text-dark-1 fails 4.5:1 on light backgrounds: text-dark-2',
  ],
  [
    /text-light-3 btn-primary/,
    'light-3 on pink fails 4.5:1: text-light-1 btn-primary',
  ],
  // WCAG 2.0 names and roles (#14)
  [/role="submit"/, 'submit is not an ARIA role: use type="submit"'],
  [/alt="image card"/, 'name a photo by its post: postAlt(post.content)'],
  [
    /<MclCardC\b|import[^\n]*\bMclCardC\b/,
    'MclCardC is a clickable div a keyboard cannot reach: FlipCard',
  ],
  // WCAG 2.0 2.2.2: nothing decorative moves forever (#14)
  [
    /\banimate-(bounce|ping|pulse)(?![-\w])/,
    'loops forever: use animate-bounce-settle (stops within 5 s)',
  ],
]

describe('component library migration', () => {
  it('uses no pre-1.0 or deprecated manguito-theme APIs in app/', () => {
    const hits: string[] = []
    for (const file of globSync('app/**/*.{vue,ts}')) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          for (const [pattern, why] of banned) {
            if (pattern.test(line)) hits.push(`${file}:${i + 1} ${why}`)
          }
        })
    }
    expect(hits).toEqual([])
  })
})
