# Accessibility Pass (WCAG 2.0 AA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every page of the site meets WCAG 2.0 AA for keyboard, screen-reader, low-vision and reduced-motion users, and CI catches regressions.

**Architecture:** The fixes are app-side only: colour token overrides in `styles.css`, template changes, and one new component (`FlipCard`) replacing `MclCardC` on Home. A new `api`-project test runs axe-core over the server-rendered HTML of every page in jsdom. A unit test checks the contrast of the colour pairs the site uses. Behaviour that only exists after a click gets mounted unit tests, and a browser walk is the PR evidence.

**Tech Stack:** Nuxt 4, Vue 3, Tailwind 4, `@bobbykim/manguito-theme` 1.x, Vitest (`api` and `unit` projects), axe-core, jsdom.

**Spec:** `docs/superpowers/specs/2026-11-24-accessibility-design.md`

## Global Constraints

- The target is WCAG 2.0 A and AA, plus the axe best-practice rules `landmark-one-main` and `page-has-heading-one`. AAA and criteria that are only in 2.1/2.2 are out of scope.
- No changes inside `node_modules/@bobbykim/*`. Everything is fixed from the app.
- Contrast: 4.5:1 for normal text, 3:1 for large text (≥24 px, or ≥18.66 px bold). Ratios are compared unrounded. Disabled controls are exempt.
- The pink is `--mcl-primary: #d02b78`. `--mcl-dark-1` is not overridden.
- No new hydration mismatches. `<ClientOnly>` and `data-allow-mismatch` stay banned (`test/unit/hydrationSuppressions.test.ts`).
- The `pnpm-workspace.yaml` override `isomorphic-dompurify>jsdom: 25.0.1` stays.
- The visual change is limited to:
  - the deeper pink, green and blue;
  - `dark-2` for text that was `dark-1`;
  - the mobile account bar in `dark-2`;
  - the login card on `light-1`;
  - the skip link, shown only on focus;
  - animations that stop after 5 s;
  - the Home empty-state message.
- Every screen-reader name matches the visible text or the control's purpose. Nothing is hidden from screen readers just to pass a check.
- Conventions from CLAUDE.md apply: Prettier, Conventional Commits with a path scope, and every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A Home tile used by mouse, then keyboard.** The first click flips it and the second opens the post. After a keyboard flip, focus is on the link, and Enter opens the post. Pinned in Task 4: `opens the post on the second click`.
2. **Captions that are long, blank or contain markup characters**, used as `alt`. These give a trimmed, readable name and never an empty `alt`. Pinned in Task 3: the `postAlt` cases.
3. **Error and redirect states** (404 page, malformed post id, guard redirects). Rendered pages are still scanned, and a redirect never silently drops a page from the scan. Pinned in Task 2: the matrix asserts each entry's status, and includes `/no-such-page` and `/posts/not-an-id`.
4. **A reduced-motion visitor flipping a tile.** The flip doesn't wait on a transition event, so it completes with transitions off. Pinned in Task 4: the tests run with transitions stubbed and expect the link at once.
5. **The account bar and alerts at the `lg` breakpoint boundary and in every alert colour actually used** (`success`, `danger`, `info`). Pinned in Task 1: the pair list has one row per alert colour and both account-bar text colours.

---

### Task 1: Colours and the contrast test

**Files:**

- Create: `test/unit/contrast.test.ts`
- Modify: `app/assets/css/styles.css` (a `:root` block after the imports)
- Modify: `app/components/layout-components/AuthBlock.vue:28` and the logged-in/logged-out wrappers
- Modify: `app/pages/auth/login.vue:50` (`bg-light-3` → `bg-light-1`)
- Modify: every `text-light-3 btn-primary` → `text-light-1 btn-primary`: `login.vue`, `signup.vue`, `auth/request.vue`, `auth/reset-password.vue`, `admin/request.vue`, `error.vue`
- Modify: every `text-dark-1` in `app/` → `text-dark-2` (13 uses; see `grep -rn text-dark-1 app`)
- Modify: `test/unit/libraryMigration.test.ts`, adding a ban on `text-dark-1` and on `text-light-3 btn-primary`

**Interfaces:**

- Produces: the token values later tasks rely on. `FlipCard` (Task 4) uses `primary` and `info` as tile faces, with no text on them.

- [ ] **Step 1: Write the failing test** `test/unit/contrast.test.ts`.

  It gets each token's hex in two layers:
  - the theme's defaults, parsed from the theme stylesheet `@import`ed by `styles.css`, as `var(--mcl-<name>, #xxxxxx)`;
  - the overrides from the `:root` block in `app/assets/css/styles.css`, as `--mcl-<name>: #xxxxxx`, which win.

  `contrast(fg, bg)` is the WCAG 2.0 formula on relative luminance. Test cases:

```ts
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
  ['Cancel button', 'light-1', 'warning', false],
  ['muted text on page', 'dark-2', 'light-1', false],
  ['muted text on post card', 'dark-2', 'light-2', false],
  ['muted text on admin rows', 'dark-2', 'light-3', false],
  ['comment author/date', 'dark-2', 'light-4', false],
  ['mobile account bar', 'light-1', 'dark-2', false],
  ['error card', 'dark-3', 'light-3', false],
  ['About button', 'light-3', 'dark-3', false],
]
it('has pairs to check', () => expect(pairs.length).toBeGreaterThan(0))
it.each(pairs)('%s meets AA', (_n, fg, bg, large) => {
  expect(contrast(hex(fg), hex(bg))).toBeGreaterThanOrEqual(large ? 3 : 4.5)
})
it('reads the override', () => expect(hex('primary')).toBe('#d02b78'))
```

Here `hex(x)` returns `x` when it starts with `#`, and otherwise the token's resolved value. It throws for an unknown token, so a typo can't pass. Before running, grep the templates (`text-*`, `bg-*`, `mcl-bg-*`, `btn-*`, and `setAlert(…, color)`) and add any pair missing from the list.

- [ ] **Step 2: Run it.**
      Run: `pnpm vitest run --project unit test/unit/contrast.test.ts`
      Expected: FAIL on the pink, alert, Cancel and override rows (ratios as in the spec's audit table).

- [ ] **Step 3: Override the tokens in `styles.css`.**
  - `:root { --mcl-primary: #d02b78; --mcl-success: …; --mcl-info: …; --mcl-warning: … }`.
  - Each green, blue and warning value is the smallest darkening of the same hue that passes under `light-1`.
  - Builder's call, with a ledger ruling: if a darker `warning` changes the look more than switching the Cancel button's text to `text-dark-4`, do that instead, and change that row to `dark-4` on `warning`.
  - Then make the template changes listed under Files:
    - `AuthBlock` below `lg`: `bg-dark-2` with `text-light-1`;
    - at `lg` and up, unchanged: transparent background and the header's text colours.

- [ ] **Step 4: Run it, plus the ban test.**
      Run: `pnpm vitest run --project unit test/unit/contrast.test.ts test/unit/libraryMigration.test.ts`
      Expected: PASS.

- [ ] **Step 5: Commit.** `fix(app/assets/): darken colours that fail AA contrast (#14)`

### Task 2: Page structure, and the axe harness for server-rendered pages

**Files:**

- Create: `test/pages/a11y.test.ts`
- Modify: `package.json`, adding devDependencies `axe-core` and `jsdom` (exact versions, like the others; `pnpm add -D -E`)
- Modify: `app/layouts/default.vue`, `app/layouts/admin.vue`
- Modify: `app/pages/index.vue`, `app/components/home/Hero.vue`, `app/components/home/GridImages.vue`
- Modify: `app/pages/posts/index.vue`, `app/pages/posts/[id].vue`, `app/pages/about.vue`, `app/pages/auth/*.vue`, `app/pages/admin/*.vue`

**Interfaces:**

- Produces: `scan(html: string, runOnly: axe.RunOnly): Promise<axe.Result[]>` and the `matrix` in `test/pages/a11y.test.ts`. Task 3 adds a second `describe` to the same file using both.

- [ ] **Step 1: Write the failing test** `test/pages/a11y.test.ts`.
  - `beforeAll`:
    - seed with `insertUser('USER')`, `insertUser('ADMIN')` and `insertPost` ×3;
    - add one `insertComment`;
    - `afterAll(clearContent)` and delete the users.
  - `scan` loads the HTML into `new JSDOM(html, { runScripts: 'outside-only' })`, evaluates `axe-core`'s source in that window, and returns `axe.run(document, { runOnly })` violations.
  - The matrix of `[path, session, status]`, where sessions are `null | 'USER' | 'ADMIN'`:
    - logged out: `/`, `/posts`, `/posts/<id>`, `/about`, the 4 auth pages, `/no-such-page` (404), `/posts/not-an-id` (404);
    - USER: `/`, `/posts`, `/posts/<id>`, `/admin/request`;
    - ADMIN: `/`, `/posts/<id>`, `/admin`, `/admin/posts`, `/admin/comments`, `/admin/users`.

```ts
it('scans something', () => expect(matrix.length).toBeGreaterThan(10))
it.each(matrix)(
  '%s (%s) has one main, one h1 and a skip link',
  async (path, who, status) => {
    const res = await page(path, tokenFor(who))
    expect(res.status).toBe(status)
    const v = await scan(res.html, {
      type: 'rule',
      values: ['landmark-one-main', 'page-has-heading-one', 'bypass'],
    })
    expect(v.map((x) => x.id)).toEqual([])
    const doc = new JSDOM(res.html).window.document
    expect(doc.querySelectorAll('main#main')).toHaveLength(1)
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    const first = doc.querySelector('#__nuxt a[href], #__nuxt button')
    expect(first?.getAttribute('href')).toBe('#main')
    expect(first?.textContent?.trim()).toBe('Skip to content')
  },
)
```

- [ ] **Step 2: Run it.**
      Run: `pnpm vitest run --project api test/pages/a11y.test.ts`
      Expected: FAIL. Every page except `/` misses `main#main` or the `h1`, and none has a skip link.

- [ ] **Step 3: Make the structure.**
  - In both layouts:
    - first in the root `<div>`: `<a href="#main" class="sr-only focus:not-sr-only …">Skip to content</a>`, styled as a visible pill on focus with the site focus ring;
    - wrap `<slot />` in `<main id="main" tabindex="-1">`;
    - the header's site name `<h2>` becomes a `<span>` with the same classes.
  - `index.vue`: its `<main>` becomes a `<div>`.
  - `Hero.vue`: the "Welcome to" `<h3>` becomes a `<p>` with the same classes.
  - The page title becomes the page's `<h1>` (same classes), with lower headings shifted so no level is skipped:
    - `/posts` "Enjoy the gallery!";
    - About;
    - the auth pages;
    - the admin pages;
    - `/admin/request` (`<h3>` → `<h1>`).
  - `posts/[id].vue` adds `<h1 class="sr-only">Post by {{ post.author.name }}</h1>` inside the content box. Use the same fallback the page already uses if `author` is missing.
  - `error.vue` already has an `<h1>`, inside the default layout.

- [ ] **Step 4: Run it.**
      Run: `pnpm vitest run --project api test/pages/a11y.test.ts test/pages/ssr.test.ts`
      Expected: PASS. If a page's existing `ssr.test.ts` assertion looked for an `<h2>`, update it to `<h1>`.

- [ ] **Step 5: Commit.** `fix(app/layouts/): one main, one h1 and a skip link on every page (#14)`

### Task 3: Names, roles, labels and alt text

**Files:**

- Create: `app/utils/postAlt.ts`, `test/unit/postAlt.test.ts`
- Modify: `test/pages/a11y.test.ts` (a second `describe`)
- Modify: `role="submit"` removed in `login.vue`, `signup.vue`, `admin/request.vue`, `UpdateUserInfo.vue` (×2). Each button keeps or gains `type="submit"`.
- Modify: `aria-label="delete post"` → `"delete comment"` in `CommentItem.vue:36` and `admin/comments.vue:47`, and → `"edit user"` in `admin/users.vue:70`. `ContentBlock.vue:79` and `admin/posts.vue:68` stay "delete post".
- Modify: `app/pages/posts/index.vue`: the tile `alt` and the new-post fields' labels
- Modify: `test/unit/libraryMigration.test.ts`: ban `role="submit"` and `alt="image card"`
- Modify: `test/unit/postsPage.test.ts`: the labels test

**Interfaces:**

- Consumes: `scan` and `matrix` (Task 2).
- Produces: `postAlt(caption: string): string`, used by Task 4's `FlipCard`.

- [ ] **Step 1: Write the failing tests.**

```ts
// test/unit/postAlt.test.ts
expect(postAlt('  Manguito on the fridge  ')).toBe('Manguito on the fridge')
expect(postAlt('')).toBe('Photo of Manguito')
expect(postAlt('   \n ')).toBe('Photo of Manguito')
expect(postAlt('a'.repeat(30) + ' ' + 'b'.repeat(90))).toBe(
  'a'.repeat(30) + '…',
) // cut at a word boundary, ≤100 chars
expect(postAlt('<b>hi</b> & "you"')).toBe('<b>hi</b> & "you"') // text, never markup; Vue escapes it
```

```ts
// test/pages/a11y.test.ts
it.each(matrix)('%s (%s) passes WCAG 2.0 A/AA', async (path, who, status) => {
  const res = await page(path, tokenFor(who))
  expect(res.status).toBe(status)
  const v = await scan(res.html, { type: 'tag', values: ['wcag2a', 'wcag2aa'] }) // color-contrast disabled in scan: no layout in jsdom
  expect(v.map((x) => `${x.id}: ${x.nodes[0]?.html}`)).toEqual([])
})
it('names /posts tiles by their caption', async () => {
  /* page('/posts') html contains alt="<seeded caption>" and not alt="image card" */
})
```

In `postsPage.test.ts`, after `mountAsAdmin()` and opening the modal:

- `label[for="file-input"]` has the text `Photo`;
- `label[for="content-input"]` has the text `Caption`.

- [ ] **Step 2: Run them.**
      Run: `pnpm vitest run --project unit test/unit/postAlt.test.ts test/unit/postsPage.test.ts test/unit/libraryMigration.test.ts && pnpm vitest run --project api test/pages/a11y.test.ts`
      Expected:
  - FAIL: `postAlt` is missing; the labels are missing; the ban hits.
  - axe FAIL with `aria-roles` on the login, signup and `/admin/request` rows.
  - Any jsdom-only false positive (a failure the browser walk doesn't show, because no CSS is loaded) gets that rule disabled in `scan`, with a comment and a ledger ruling. A rule the walk also reports is never disabled.

- [ ] **Step 3: Implement.**
  - `postAlt` in `app/utils/postAlt.ts` (auto-imported).
  - Change the `/posts` tile `alt` to `postAlt(post.content)`.
  - `MclFormGroup` gets `label="Photo"` and `label="Caption"` in the new-post modal.
  - Then the role and `aria-label` edits listed under Files.

- [ ] **Step 4: Run them.**
      Same commands as Step 2.
      Expected: PASS.

- [ ] **Step 5: Commit.** `fix(app/pages/): accurate names, roles, labels and alt text (#14)`

### Task 4: Home tiles a keyboard can use, and Home's empty state

**Files:**

- Create: `app/components/home/FlipCard.vue`, `test/unit/flipCard.test.ts`
- Modify: `app/components/home/GridImages.vue`, `app/pages/index.vue`
- Modify: `test/unit/homePage.test.ts`
- Modify: `test/unit/libraryMigration.test.ts`: ban `MclCardC`

**Interfaces:**

- Consumes: `postAlt` (Task 3).
- Produces: `FlipCard` props `{ imageSource: string; caption: string; to: string; index: number; color: ColorPalette }`. `GridImages` props become `{ cards: PostType[]; pending: boolean }`.

- [ ] **Step 1: Write the failing tests.** `flipCard.test.ts` uses `mountSuspended(FlipCard, { props: { imageSource: 'x.jpg', caption: 'On the fridge', to: '/posts/p1', index: 3, color: 'primary' } })`, with transitions stubbed (the default).
  - `starts as a button named "Flip photo 3"`:
    - one `button[type=button]` with `aria-label="Flip photo 3"`;
    - no `a`;
    - no `img` exposed to assistive tech (none rendered, or `alt=""` inside the button).
  - `flips on Enter and moves focus to the post link`:
    - trigger `click` on the button (a native button turns Enter into click; `trigger('keydown.enter')` is not needed);
    - after `nextTick` there's an `a[href="/posts/p1"]` whose `img` has `alt="On the fridge"`;
    - `document.activeElement` is that `a`;
    - no `button` is left.
  - `opens the post on the second click`: click the button, then click the link. `useRouter().currentRoute.value.path` is `/posts/p1` (await navigation).

  `homePage.test.ts`:
  - `shows a message, not a spinner, when there are no posts`:
    - `mockApi` answers `okEnvelope({ posts: [], nextCursor: null })`;
    - mounted Home has the text `No photos to show right now.` and no `.animate-spin`.
  - `shows a tile per post`: one `button[aria-label^="Flip photo"]` per post.

- [ ] **Step 2: Run them.**
      Run: `pnpm vitest run --project unit test/unit/flipCard.test.ts test/unit/homePage.test.ts test/unit/libraryMigration.test.ts`
      Expected: FAIL (`FlipCard` is missing; Home renders a spinner; the ban hits `GridImages.vue`).

- [ ] **Step 3: Implement.**
  - `FlipCard.vue` copies `MclCardC`'s look from `node_modules/@bobbykim/mcl-cards/dist/mcl-cards.js`:
    - `perspective`, `transform-style: preserve-3d`, `rotateY(360deg)` over 1.6 s;
    - the face colour as `mcl-bg-<color>`;
    - the image fading in after 0.5 s.
  - A wrapper `div` keeps the size and flip classes. Inside it, unflipped renders a full-size `<button type="button" :aria-label="`Flip photo ${index}`">`, and flipped renders a full-size `<NuxtLink :to>` with `<img :src :alt="postAlt(caption)">`.
  - After flipping, `await nextTick()` and focus the link through a template ref.
  - Under `motion-reduce:`, no transition or delay.
  - Both elements get `focus-visible:mcl-focus-ring`.
  - `GridImages` renders `<FlipCard v-for="(card, idx) in cards" … :index="idx + 1" :color="resolveCardColor(idx)" :to="`/posts/${card._id}`" :caption="card.content">`.
    - It shows the spinner only `v-if="pending"`.
    - With no cards and not pending, it shows `<p class="py-md text-center text-dark-2">No photos to show right now.</p>`.
  - `index.vue` passes `:pending="status === 'pending'"` from its `useApi` call.

- [ ] **Step 4: Run them, plus Home's SSR axe rows.**
      Run: `pnpm vitest run --project unit test/unit/flipCard.test.ts test/unit/homePage.test.ts test/unit/libraryMigration.test.ts && pnpm vitest run --project api test/pages/a11y.test.ts`
      Expected: PASS.

- [ ] **Step 5: Commit.** `fix(app/components/): Home photo tiles a keyboard can flip and open (#14)`

### Task 5: Upload announcements by stage

**Files:**

- Modify: `app/pages/posts/index.vue:203-226`
- Modify: `test/unit/postsPage.test.ts`

- [ ] **Step 1: Write the failing test** `announces the upload stage, not each percent`.
  - Use the file's existing `FakeXhr` flow and report progress 40.
  - The `[aria-live]` element inside the modal has the exact text `Uploading photo`.
  - It doesn't contain `40`.
  - `[role=progressbar]` has `aria-valuenow="40"` and is not inside any `[aria-live]`.
  - The visible text `Uploading… 40%` is still in the modal.

- [ ] **Step 2: Run it.**
      Run: `pnpm vitest run --project unit test/unit/postsPage.test.ts -t "upload stage"`
      Expected: FAIL (the live region contains `Uploading… 40%`).

- [ ] **Step 3: Implement.**
  - Drop `aria-live` from the visible status block.
  - Add `<p class="sr-only" role="status" aria-live="polite">{{ stageText }}</p>`. `stageText` is `Preparing photo` / `Uploading photo` / `Saving post` / `''`, computed from `uploadState` and `progress < 100`.

- [ ] **Step 4: Run it, plus the whole file.**
      Run: `pnpm vitest run --project unit test/unit/postsPage.test.ts`
      Expected: PASS.

- [ ] **Step 5: Commit.** `fix(app/pages/): announce upload stages instead of every percent (#14)`

### Task 6: Focus rings and motion

**Files:**

- Modify: `app/assets/css/styles.css`, `app/assets/css/page_transition.css`
- Modify: `app/components/home/Hero.vue`, `app/components/home/GridImages.vue`
- Modify: `app/layouts/default.vue`, `app/layouts/admin.vue` (`useWindowScroll`)
- Modify: `test/unit/libraryMigration.test.ts`: ban `animate-bounce\b` and `animate-ping\b`/`animate-pulse\b` (use the finite `animate-bounce-settle`)

- [ ] **Step 1: Write the failing test.** Add the ban rows, and a test in `test/unit/libraryMigration.test.ts` (or a new `motion.test.ts`) that reads `styles.css` and expects:
  - `--animate-balls` and `--animate-bounce-settle`, each with a finite iteration count and `delay + duration × count ≤ 5s`, checked by parsing the declarations;
  - an `@media (prefers-reduced-motion: reduce)` block.

- [ ] **Step 2: Run it.**
      Run: `pnpm vitest run --project unit test/unit/libraryMigration.test.ts`
      Expected: FAIL (`animate-bounce` in `Hero.vue` and `GridImages.vue`; `balls 5s infinite`).

- [ ] **Step 3: Implement.**
  - **In `styles.css`:**
    - `--animate-balls: balls 5s 1` (or shorter);
    - the three blobs' delays plus durations end within 5 s. Shorten the `animation-delay-*` utilities or the durations; builder's call.
    - `--animate-bounce-settle: bounce 1s 5`;
    - `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation: none !important; transition-duration: 0s !important; scroll-behavior: auto !important } }`. The loading spinner is exempted with a class (`motion-safe-spin`, or an explicit `animation` restore) because it signals progress.
    - Footer menu links get a focus ring: `footer a:focus-visible` with the theme's focus-ring styles, the same as `focus-visible:mcl-focus-ring`. Scope the selector to `MclFooterA`'s root class if `footer` matches more.
  - **In `page_transition.css`:** the page transition goes inside `@media (prefers-reduced-motion: no-preference)`.
  - **In both layouts:** `useWindowScroll({ behavior })` takes a getter that answers `'auto'` when `usePreferredReducedMotion()` is `'reduce'`, and `'smooth'` otherwise.
  - **In `Hero.vue` and `GridImages.vue`:** `animate-bounce` → `animate-bounce-settle`.

- [ ] **Step 4: Run it.**
      Run: `pnpm vitest run --project unit`
      Expected: PASS.

- [ ] **Step 5: Commit.** `fix(app/assets/): finite animations, reduced motion and footer focus rings (#14)`

### Task 7: CLAUDE.md, the browser walk and the full check

**Files:**

- Modify: `CLAUDE.md` (Conventions: a new **Accessibility** bullet after **Hydration**, and the Tests section mentions `test/pages/a11y.test.ts` and `test/unit/contrast.test.ts`)

- [ ] **Step 1: The Accessibility bullet** says:
  - the layouts give every page the skip link and `<main id="main">`, and each page has exactly one `<h1>`;
  - colours go only through theme tokens, and every new text/background pair gets a row in `test/unit/contrast.test.ts` (4.5:1, or 3:1 for large text);
  - every field has a visible label, names match the visible text, and anything clickable is a `<button>` or a link (hence `FlipCard`, not `MclCardC`);
  - `postAlt` names photos;
  - animations end within 5 s and stop under reduced motion;
  - `test/pages/a11y.test.ts` (axe on server-rendered pages) is the gate.

- [ ] **Step 2: The browser walk.**
      Run `walk14.mjs` and `keys14.mjs` (scratchpad) against `pnpm dev` on the local DB:
  - at 390, 800 and 1200 px;
  - with the hydration-warning listener from `walk19.mjs`;
  - with a `reducedMotion: 'reduce'` context;
  - checking after 6 s that no element on Home still has a running animation, the spinner excepted.

  Expected:
  - 0 axe violations (`color-contrast` included);
  - every focusable element has a ring;
  - the Home tiles flip and open by keyboard;
  - 0 hydration warnings.

  Record before and after counts for the PR. Clean up only the records the scripts seeded.

- [ ] **Step 3: The full check.**
      Run: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`
      Expected: all exit 0.

- [ ] **Step 4: Commit.** `docs(CLAUDE.md): accessibility conventions (#14)`
