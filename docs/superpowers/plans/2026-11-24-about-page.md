# About Page Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The About page shows the approved copy, its own description meta, and a version read from `package.json`.

**Architecture:** `nuxt.config.ts` puts `package.json`'s version in `appConfig`. `app/pages/about.vue` gets the new paragraphs, reads `useAppConfig().version`, and adds three description metas to its `useHead`. A server-render test checks all of it.

**Tech Stack:** Nuxt 4 (`appConfig`, `useHead`), Vitest `api` project (`test/pages/`).

**Spec:** `docs/superpowers/specs/2026-11-24-about-page-design.md`

## Global Constraints

- The text is exactly the spec's approved copy. Keep "favourite", the colons and "late May".
- The description is exactly `Meet Manguito, a peach-faced lovebird, and the story behind his photo blog.`
- No layout or class changes in `about.vue`: same wrapper, same `text-lg font-bold` block, same photo and links.
- Only the version string reaches the client: never import `package.json` in app code.
- Commits follow Conventional Commits with a path scope and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Apostrophes and quotes in the copy** ("couldn't", "you'd") are HTML-escaped in the server render. The test must compare decoded text, not raw HTML. Pinned: the test reads text through `JSDOM`.
2. **The page's description must replace the site-wide one, not sit next to it.** Pinned: the test expects exactly one `meta[name="description"]` and one `meta[property="og:description"]`.
3. **A missing `appConfig.version`** would render "Version: undefined". Pinned: the test compares against `package.json`'s version read in the test.
4. **Prettier wraps long paragraphs,** adding line breaks inside the text. Pinned: the test collapses whitespace before comparing.
5. **The accessibility gate** still passes on `/about` (one `h1`, links named). Pinned: the existing `test/pages/a11y.test.ts` runs in Step 4.

---

### Task 1: About copy, version and description

**Files:**

- Modify: `nuxt.config.ts` (an `appConfig: { version }` key, with `import pkg from './package.json'`)
- Modify: `app/pages/about.vue:1-20` (`useHead` metas, `useAppConfig`) and `:55-63` (the text)
- Test: `test/pages/ssr.test.ts` (a new `describe('about page')`)

- [ ] **Step 1: Write the failing test.** Add `describe('about page')` with `it('shows the approved copy, the package version and its own description')`:

```ts
const res = await page('/about')
expect(res.status).toBe(200)
const doc = new JSDOM(res.html).window.document
const text = doc.querySelector('main')!.textContent!.replace(/\s+/g, ' ')
for (const line of [
  "Manguito Page is a photo diary of Manguito, a peach-faced lovebird who came to us one late May as a fragile baby who couldn't even chew banana. These days he chirps, flies laps around the house, steals bites of our food and sticks close to my wife.",
  "Here you'll find his everyday moments: the cuddles, the millet and the mischief. Browse the gallery, and sign up if you'd like to comment on your favourite photos.",
  "I built the site myself and keep improving it as a side project. It's made with Nuxt, and you can install it as an app on your phone.",
  `Version: ${pkg.version}`,
  'Maintainer: Bobby Kim',
])
  expect(text).toContain(line)
const description =
  'Meet Manguito, a peach-faced lovebird, and the story behind his photo blog.'
for (const sel of [
  'meta[name="description"]',
  'meta[property="og:description"]',
  'meta[name="twitter:description"]',
]) {
  const metas = doc.querySelectorAll(sel)
  expect(metas).toHaveLength(1)
  expect(metas[0]!.getAttribute('content')).toBe(description)
}
```

Read `pkg` in the test with `JSON.parse(readFileSync('package.json', 'utf8'))`.

- [ ] **Step 2: Run it.**
      Run: `pnpm vitest run --project api test/pages/ssr.test.ts -t "about page"`
      Expected: FAIL. The first paragraph is missing (the old copy is there), and the description is the site-wide one.

- [ ] **Step 3: Implement.**
  - **`nuxt.config.ts`:** add `appConfig: { version: pkg.version }`.
  - **`about.vue`:**
    - `const { version } = useAppConfig()`;
    - in `useHead.meta`, add `{ name: 'description', … }`, `{ property: 'og:description', … }` and `{ name: 'twitter:description', … }` with the spec's text;
    - replace the one `<p>` with the three paragraphs;
    - `<p>Version: {{ version }}</p>`;
    - keep `Maintainer`.

- [ ] **Step 4: Run it, plus the accessibility scan.**
      Run: `pnpm vitest run --project api test/pages/ssr.test.ts test/pages/a11y.test.ts`
      Expected: PASS.

- [ ] **Step 5: Full check, then commit.**
      Run: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`
      Expected: exit 0.
      Commit: `feat(app/pages/): new About page copy and description (#20)`
