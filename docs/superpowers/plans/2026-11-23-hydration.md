# Hydration Mismatches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every page hydrates without warnings, with no `<ClientOnly>` or `data-allow-mismatch` left to hide one.

**Architecture:** Fix each cause the inventory found: dates go through a `<LocalDate>` wrapper around Nuxt's `<NuxtTime>` (visitor's timezone, rewritten before hydration); the copy-link button stops depending on client-only feature detection; `postStore.loadFirstPage` never fetches while hydrating; the header loses its blanket suppression. A file-scan test keeps suppressions out.

**Tech Stack:** Nuxt 4.6 (`<NuxtTime>`, `useNuxtApp().isHydrating`), Vue 3.5, Pinia setup stores, VueUse 15 `useClipboard`, Vitest (`unit` and `api` projects).

**Spec:** `docs/superpowers/specs/2026-11-23-hydration-design.md`

## Global Constraints

- Dates show the **visitor's own date**, in English: `locale="en-US"`, `weekday="short"`, `month="short"`, `day="numeric"`, `year="numeric"` → "Fri, Nov 20, 2026".
- No `<ClientOnly>` and no `data-allow-mismatch` anywhere in `app/` when done.
- No new dependencies; CI unchanged.
- Out of scope: `$apiFetch`'s type, `/posts` reload scroll, `og:image`, #14 items.
- Conventions from CLAUDE.md: Prettier, Conventional Commits with a path scope, commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; tests never touch real Cloudinary or mail; run `pnpm lint` and `pnpm format` before committing.
- The `api` test project builds the app; never set `SKIP_BUILD=1` after an `app/` or `server/` change unless a build has run since.

## Review Focus

1. **A normal client-side visit to `/posts`** (not hydrating) must still load page one, and "Try again" after a failed server render must load it. Task 3 tests both.
2. **A visitor whose browser language isn't English** must still see the English format, only shifted to their timezone. Task 5's walk runs one context with `locale: 'ko-KR'` and checks the date text is English.
3. **Copy link on plain http** (no Clipboard API): clicking it must still copy and show "Copied url to clipboard". Task 5's walk clicks it on `http://localhost:3000`.
4. **The date's layout**: `<LocalDate>` sits inside the existing `<p>` (right-aligned, small) so the line looks as before. Task 1 keeps the `<p>` wrappers; Task 5's walk checks the dates are visible.
5. **The footer year** must render on the server and match in the browser. Task 1's SSR test checks it's in the HTML; Task 5's walk checks no warning.

---

### Task 1: `<LocalDate>` and server-rendered dates

**Files:**

- Create: `app/components/LocalDate.vue`
- Modify: `app/components/posts/ContentBlock.vue:54-56`, `app/components/posts/CommentItem.vue:27-29`, `app/pages/admin/posts.vue:60-62`, `app/pages/admin/comments.vue:39-41`, `app/layouts/default.vue:219-223`, `app/layouts/admin.vue:292-296`
- Test: `test/unit/localDate.test.ts` (new), `test/pages/ssr.test.ts`

**Interfaces:**

- Produces: `<LocalDate :datetime="string | Date" />` rendering `<time datetime="<ISO>">` with the en-US short date in the visitor's timezone.

- [ ] **Step 1: Write the failing unit test** `test/unit/localDate.test.ts`

```ts
it('renders the en-US short date of the instant in a <time>', async () => {
  const iso = '2026-11-20T06:00:00.000Z'
  const wrapper = await mountSuspended(LocalDate, { props: { datetime: iso } })
  const time = wrapper.find('time')
  expect(time.attributes('datetime')).toBe(iso)
  expect(time.text()).toBe(
    new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso)),
  )
})
```

- [ ] **Step 2: Write the failing SSR tests** in `test/pages/ssr.test.ts`

A `const timeTag = /<time[^>]*datetime="[^"]+"[^>]*>[^<]+<\/time>/g` helper, then:

- `'server-renders the post and comment dates and the footer year'`: insert a MANAGER, a post (`insertPost`) and a comment (`insertComment`) on it; `page('/posts/<id>')` HTML has at least 2 `timeTag` matches, and matches `/Manguito Page\s*<time[^>]*>\d{4}<\/time>/`.
- `'server-renders dates on /admin/posts and /admin/comments'`: with an ADMIN token and one post plus one comment, each page's HTML has at least 1 `timeTag` match, and `/admin/posts` also has the footer year match.
- Clean up with `clearContent()` (or the delete pattern the file already uses).

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm vitest run --project unit test/unit/localDate.test.ts`
Expected: FAIL, `LocalDate.vue` can't be resolved.
Run: `pnpm vitest run --project api test/pages/ssr.test.ts`
Expected: the two new tests FAIL (0 `<time>` matches; `<ClientOnly>` renders nothing on the server); the rest pass.

- [ ] **Step 4: Implement `app/components/LocalDate.vue`**

Props `{ datetime: string | Date }`; template is one `<NuxtTime :datetime="datetime" locale="en-US" weekday="short" month="short" day="numeric" year="numeric" />`. Replace each of the four `<ClientOnly><p>{{ new Date(x.date).toDateString() }}</p></ClientOnly>` with `<p><LocalDate :datetime="x.date" /></p>` (explicit import, as the files already import components). In both layouts replace the `<ClientOnly><small>… {{ new Date().getFullYear() }}</small></ClientOnly>` with `<small class="text-light-1">&copy; Manguito Page <NuxtTime :datetime="now" year="numeric" locale="en-US" /></small>`, where `now` is `new Date()` from the layout's setup (NuxtTime takes the server's instant from the HTML during hydration, so the year can't differ).

- [ ] **Step 5: Run the tests to see them pass**

Run: `pnpm vitest run --project unit test/unit/localDate.test.ts` → PASS
Run: `pnpm vitest run --project api test/pages/ssr.test.ts` → PASS
Run: `pnpm vitest run --project unit` → all PASS (the page tests that mount these components still pass)

- [ ] **Step 6: Commit**

```bash
git add app/components/LocalDate.vue app/components/posts app/pages/admin app/layouts test/unit/localDate.test.ts test/pages/ssr.test.ts
git commit -m "fix(app/components/): render dates on the server in the visitor's timezone with LocalDate"
```

### Task 2: the copy-link button renders on the server

**Files:**

- Modify: `app/pages/posts/[id].vue:21`
- Test: `test/pages/ssr.test.ts`

- [ ] **Step 1: Write the failing test** `'server-renders the copy-link button'`: insert a MANAGER and a post; `page('/posts/<id>')` HTML matches `/<button[^>]*aria-label="copy current url"/`. (Fold into the existing `'server-renders a post'` test if simpler.)

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run --project api test/pages/ssr.test.ts`
Expected: FAIL on the copy-link match (`isSupported` is false on the server).

- [ ] **Step 3: Change `useClipboard()` to `useClipboard({ legacy: true })`** in `app/pages/posts/[id].vue`, keeping `v-if="isSupported"` (now true on both sides).

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm vitest run --project api test/pages/ssr.test.ts` → PASS
Run: `pnpm vitest run --project unit test/unit/postPage.test.ts` → PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/posts/[id].vue test/pages/ssr.test.ts
git commit -m "fix(app/pages/): render the copy-link button on the server too"
```

### Task 3: no refetch of page one while hydrating

**Files:**

- Modify: `app/stores/postStore.ts:17-48`
- Test: `test/unit/postStore.test.ts` (the paging `describe`, which has the `pages(...)` helper and `requests`)

**Interfaces:**

- Produces: `loadFirstPage()` returns without a request while `useNuxtApp().isHydrating` is true; otherwise unchanged.

- [ ] **Step 1: Write the failing tests**

```ts
it('loadFirstPage keeps the server result while hydrating', async () => {
  pages({ posts: ['p1'], nextCursor: null })
  const store = usePostStore()
  store.$patch({ status: 'error' }) // page one failed during the server render
  const nuxtApp = useNuxtApp()
  nuxtApp.isHydrating = true
  try {
    await store.loadFirstPage()
  } finally {
    nuxtApp.isHydrating = false
  }
  expect(requests).toHaveLength(0)
  expect(store.status).toBe('error')
  await store.retry()
  expect(requests).toHaveLength(1)
  expect(store.posts.map((x) => x._id)).toEqual(['p1'])
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run --project unit test/unit/postStore.test.ts`
Expected: FAIL, `requests` has length 1.

- [ ] **Step 3: Implement**: take `isHydrating` from the `useNuxtApp()` already resolved at the top of the store (keep the app object, not a destructured boolean, so the flag is read at call time), and return early from `loadFirstPage` when it's true. Add a one-line comment: the server's result stands; a failed page shows its error line and Try again.

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run --project unit test/unit/postStore.test.ts test/unit/postsPage.test.ts test/unit/adminPostsPage.test.ts test/unit/loadMoreStatus.test.ts` → PASS

- [ ] **Step 5: Commit**

```bash
git add app/stores/postStore.ts test/unit/postStore.test.ts
git commit -m "fix(app/stores/): don't refetch the first page of posts while hydrating"
```

### Task 4: remove the header suppression, guard against new ones, document

**Files:**

- Modify: `app/layouts/default.vue:98`, `app/layouts/admin.vue:94`, `CLAUDE.md`
- Test: `test/unit/hydrationSuppressions.test.ts` (new)

- [ ] **Step 1: Write the failing test**: same shape as `test/unit/libraryMigration.test.ts`, scanning `app/**/*.{vue,ts}` line by line for `/<ClientOnly\b|\bdata-allow-mismatch\b/` and expecting `hits` to equal `[]`, with a comment: fix a mismatch's cause (see CLAUDE.md) instead of hiding it.

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run --project unit test/unit/hydrationSuppressions.test.ts`
Expected: FAIL with the two `data-allow-mismatch` lines in the layouts (Task 1 removed the `<ClientOnly>` ones).

- [ ] **Step 3: Remove `data-allow-mismatch`** from `<HeaderHorizontal>` in both layouts.

- [ ] **Step 4: Run it to see it pass** → PASS

- [ ] **Step 5: Update CLAUDE.md**
  - Replace the "Browser-only APIs" bullet: browser-only APIs (window, image work) run only in handlers or behind `import.meta.client`, and nothing that differs between server and browser may decide what renders (feature detection like `useClipboard().isSupported`, `Date`, the timezone). Show dates with `<LocalDate :datetime>` (`app/components/LocalDate.vue`, `<NuxtTime>` in en-US, the visitor's timezone). `<ClientOnly>` and `data-allow-mismatch` are banned by `test/unit/hydrationSuppressions.test.ts`; fix the cause.
  - In the Client state bullet's `postStore` text, after `loadFirstPage()`: "it doesn't fetch while hydrating, so a page one that failed on the server shows its error and Try again".

- [ ] **Step 6: Full check**

Run: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`
Expected: all clean and green.

- [ ] **Step 7: Commit**

```bash
git add app/layouts test/unit/hydrationSuppressions.test.ts CLAUDE.md
git commit -m "fix(app/layouts/): drop the header's mismatch suppression and ban new ones"
```

### Task 5: browser walk (evidence, no commit)

- [ ] **Step 1:** `pnpm dev` on the local DB; run the scratchpad walk (`walk19.mjs`, 14 pages × logged out/USER/ADMIN × 1200/390 px, browser in Asia/Seoul). Expected: `0/84 loads with warnings` (before: 6 as shipped, 10 with suppressions stripped).
- [ ] **Step 2:** In one extra context (`locale: 'ko-KR'`, `timezoneId: 'Asia/Seoul'`) on the post page: the post date's text is the en-US format for Seoul ("Fri, Nov 20, 2026" for the 06:00 UTC post), the date is visible, and clicking "copy current url" on `http://localhost:3000` shows "Copied url to clipboard".
- [ ] **Step 3:** The walk removes the records it seeded; confirm the cleanup line, stop the dev server.
