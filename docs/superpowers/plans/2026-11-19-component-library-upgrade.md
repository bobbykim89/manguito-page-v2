# Component library upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the five `@bobbykim/*` packages to latest and fix every break so the site looks and works like production (#12).

**Architecture:** Bump all five packages first, then fix each breakage under a test that fails against the new library: posts-page modal and form, the sidebar accordion, then a repo-wide guard that bans old API names. Finish with a screenshot walkthrough and the PR.

**Tech Stack:** Nuxt 4, `@bobbykim/manguito-theme` 1.6.0 (`Modal`, `Collapse`, `AccordionGroup`, `useCollapseTrigger`), `@bobbykim/mcl-forms` 0.13.0, Vitest `unit` project (`mountSuspended`), Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-19-component-library-upgrade-design.md`

## Global Constraints

- Exact versions: `@bobbykim/manguito-theme` 1.6.0, `@bobbykim/mcl-cards` 0.10.9, `@bobbykim/mcl-container` 0.9.8, `@bobbykim/mcl-footer` 0.10.9, `@bobbykim/mcl-forms` 0.13.0 (pinned exactly, as today).
- Don't bump anything else (#13). A `@vueuse/core` peer warning (mcl wants ^12, app has 14.2.0) is left alone unless something breaks; note it in the PR.
- If pnpm's minimum release age blocks an install, add `minimumReleaseAgeExclude: ['@bobbykim/*']` to `pnpm-workspace.yaml`.
- No new accessibility props beyond what the rewritten code needs (#14). Never hide the focus ring (`btn-no-ring`, `outline-none` on buttons).
- Keep each hover fade's current opacity number.
- Out of scope, report only: `className="…"` on plain `<div>`/`<h2>`/`<p>` in `app/pages/index.vue:133-140` (JSX-style attribute, probably a hydration bug, belongs to #19).
- Commits: Conventional Commits with path scope, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer. Branch `chore/12-mcl-upgrade` (exists, spec committed).

## Review Focus

1. Sidebar accordion after a username save: the panel should stay usable (open/close again) after its form submits. Pinned by Task 3's "toggles again after submit" test.
2. New-post modal opened, cancelled, reopened: the second open must work and the form must be empty. Pinned by Task 2's reopen test.
3. Collapse panels during SSR: closed panels must not flash open before hydration (1.2.0 renders them `display: none`). Pinned by Task 3's server-HTML assertion.
4. Keyboard: Tab to the new-post button and the sidebar triggers shows the 1.6 focus ring, and Enter/Space operates them (they are real `<button>`s). Checked in Task 5's walkthrough.
5. Admin users page modal (`pages/admin/users.vue`) keeps its rounded corners with `custom-class`. Pinned by Task 4's guard (no `class-name` left), and checked in Task 5's walkthrough.

---

### Task 1: Bump the packages

**Files:**

- Modify: `package.json` (lines 31-35), `pnpm-lock.yaml`, maybe `pnpm-workspace.yaml`

**Interfaces:**

- Produces: the 1.x library installed; later tasks import `AccordionGroup`, `Collapse`, `Modal` from `@bobbykim/manguito-theme` and `useCollapseTrigger` from `@bobbykim/manguito-theme/composable`.

- [ ] **Step 1: Install exact versions**

Run: `pnpm add -E @bobbykim/manguito-theme@1.6.0 @bobbykim/mcl-cards@0.10.9 @bobbykim/mcl-container@0.9.8 @bobbykim/mcl-footer@0.10.9 @bobbykim/mcl-forms@0.13.0`
Expected: install succeeds; `package.json` shows the five exact versions. A `@vueuse/core` peer warning is acceptable.

- [ ] **Step 2: Verify the toolchain still runs**

Run: `pnpm typecheck && pnpm lint && pnpm test > .superpowers/t1.log 2>&1; tail -20 .superpowers/t1.log`
Expected: all pass (32 tests). If typecheck flags an old prop name, leave it for the task that owns that file and record a ruling.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml
git commit -m "chore(package.json): upgrade @bobbykim packages to latest"
```

### Task 2: Posts page modal and form

**Files:**

- Modify: `app/pages/posts/index.vue` (imports lines 5-6, button ~line 110-115, `<Modal>` ~155-161, `MclInputFile` ~165-176, `MclTextArea` ~179-185)
- Test: `test/unit/postsPage.test.ts` (create)

**Interfaces:**

- Consumes: `Modal` exposes `open()`, `close()`, `toggle()` via its template ref (1.6.0).

- [ ] **Step 1: Write the failing tests**

In `test/unit/postsPage.test.ts`: `beforeEach(resetState)`, `afterEach(clearApiMocks)`. Make the page see an admin: set `useUserStore()`'s `currentUser` to a user with role `'ADMIN'`, `isAuthenticated = true`, `role = 'ADMIN'` (and mock `GET /api/post` → `[]` if the mount fetches). Mount `@/pages/posts/index.vue` with `mountSuspended`.

```ts
it('opens the new-post modal from the new post button', async () => {
  // click button[aria-label="new post"], await flushPromises/nextTick
  expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
})
it('gives the modal its rounded corners', async () => {
  // after opening: the dialog panel (the element the Modal applies customClass to)
  expect(dialogPanel.classes()).toContain('rounded-lg')
})
it('requires a file', async () => {
  expect(
    wrapper.find('input[type="file"]').attributes('required'),
  ).toBeDefined()
})
it('opens again after Cancel, with an empty form', async () => {
  // open, type into textarea, click Cancel (button[type="reset"]), wait for close, open again
  expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(
    '',
  )
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run --project unit test/unit/postsPage.test.ts`
Expected: FAIL. The button doesn't open the modal (v-toggle), `rounded-lg` is missing, and `required` is missing.

- [ ] **Step 3: Fix `app/pages/posts/index.vue`**

- Drop the `vToggle` import; the new-post button gets `@click="modalRef?.open()"` (keep `aria-label="new post"`).
- `<Modal>`: `:class-name` → `:custom-class="['rounded-lg']"` (or `custom-class="rounded-lg"`, whichever the 1.6 prop type takes).
- `MclInputFile`: `is-required` → `required`, `display-border` → `show-border`. `MclTextArea`: `display-border` → `show-border`.
- Hover fades in this file: `hover:bg-opacity-70` → `hover:bg-primary/70` (new-post button), `hover:bg-opacity-60` → `hover:bg-primary/60` (Load More).

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run --project unit test/unit/postsPage.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/pages/posts/index.vue test/unit/postsPage.test.ts
git commit -m "fix(app/pages/posts/): open the new-post modal by ref and use 1.x prop names"
```

### Task 3: Sidebar username/password accordion

**Files:**

- Modify: `app/components/layout-components/UpdateUserInfo.vue` (template lines 28-~95, script imports lines 2-4)
- Test: `test/unit/updateUserInfo.test.ts` (create)

**Interfaces:**

- Consumes: `useCollapseTrigger(collapseRef: Ref<{ isOpen: boolean; toggle(): void } | null | undefined>, { id: string; visible?: MaybeRefOrGetter<boolean> }) → { attrs: ComputedRef<{ 'aria-expanded': boolean; 'aria-controls': string }>; isOpen; toggle }` from `@bobbykim/manguito-theme/composable`. `<AccordionGroup>` keeps one `Collapse` open, keyed by each `Collapse`'s `id`.
- Produces: the component's emits (`on-username-update`, `on-pw-update`) and payloads stay unchanged.

- [ ] **Step 1: Write the failing tests**

Mount `@/components/layout-components/UpdateUserInfo.vue` with `mountSuspended`. Triggers are the buttons with text "Update Username" and "Update Password".

```ts
it('starts with both panels closed and wired to their triggers', () => {
  // username trigger: aria-expanded="false", aria-controls="update-username"
  // password trigger: aria-expanded="false", aria-controls="update-password"
  // #update-username and #update-password are not visible
})
it('opens a panel from its trigger', async () => {
  // click username trigger -> aria-expanded="true", #update-username visible
})
it('keeps only one panel open', async () => {
  // open username, then click password -> password expanded, username aria-expanded="false" and hidden
})
it('closes an open panel from its trigger', async () => {
  // click username twice -> aria-expanded="false"
})
it('toggles again after its form submits', async () => {
  // open username, set input, submit the form -> emits on-username-update once;
  // click the trigger twice more -> still toggles (false then true)
})
it('keeps the panel background', () => {
  expect(wrapper.find('#update-username').classes()).toContain('bg-light-3/65')
})
```

No page test is needed: the sidebar only renders when logged in. Instead, the first test asserts that the closed panels are in the DOM with `display: none` (`element.style.display === 'none'`), which is what the server renders since 1.2.0.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run --project unit test/unit/updateUserInfo.test.ts`
Expected: FAIL. No `aria-expanded`, and the triggers don't open the panels (v-collapse is dead).

- [ ] **Step 3: Rewrite the template and script**

- Imports: `AccordionGroup`, `Collapse` from `@bobbykim/manguito-theme`; `useCollapseTrigger` from `@bobbykim/manguito-theme/composable`. Drop `vCollapse`.
- Two refs, `usernamePanel` and `passwordPanel` (`ref<InstanceType<typeof Collapse>>()`), and two triggers: `useCollapseTrigger(usernamePanel, { id: 'update-username' })` and `useCollapseTrigger(passwordPanel, { id: 'update-password' })`.
- Wrap both blocks in `<AccordionGroup>` and keep the current wrapper divs and their classes. Each button gets `type="button"`, `v-bind="<trigger>.attrs.value"` and `@click="<trigger>.toggle()"`. Each `Collapse` gets `ref`, keeps its `id`, and swaps `accordion`/`class-name` for `custom-class="bg-light-3/65"`.
- Hover: `hover:bg-opacity-60` → `hover:bg-light-3/60` on both triggers.
- Existing `<button role="submit" …>Save</button>`: leave it (an a11y fix for #14). A test that needs the form submitted submits the `form` element directly.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run --project unit test/unit/updateUserInfo.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/layout-components/UpdateUserInfo.vue test/unit/updateUserInfo.test.ts
git commit -m "fix(app/components/layout-components/): rebuild the account panels on AccordionGroup"
```

### Task 4: Ban old API names; fix what's left

**Files:**

- Create: `test/unit/libraryMigration.test.ts`
- Modify: `app/pages/admin/users.vue` (~line 97), `app/pages/about.vue` (~line 112), plus anything else the guard finds

**Interfaces:**

- Consumes: nothing from earlier tasks. Its guard must pass on what Tasks 2–3 left.

- [ ] **Step 1: Write the failing guard test**

`test/unit/libraryMigration.test.ts` reads every `.vue` file under `app/` (`node:fs` + a recursive walk, or `fs.globSync('app/**/*.vue')`), and for each pattern lists the offending `file:line`s. It expects that list to be empty:

| Pattern (regex)               | Why                             |
| ----------------------------- | ------------------------------- |
| `/:?class-name=/`             | `customClass` since 1.0         |
| `/\bis-required\b/`           | `required` since 1.0            |
| `/\s:?display-[a-z]+/`        | `show*` since 1.0               |
| `/v-collapse\b\|vCollapse/`   | sunsetted                       |
| `/v-toggle\b\|vToggle/`       | deprecated, open dialogs by ref |
| `/\baccordion=/`              | ignored; use `<AccordionGroup>` |
| `/bg-opacity-/`               | only affects `mcl-bg-*` in 1.x  |
| `/\bno-(backdrop\|header)\b/` | `show-backdrop` / `show-header` |
| `/\btextcolor=/`              | `text-color`                    |
| `/\bbtn-no-ring\b/`           | must not hide the focus ring    |

Test name: `it('uses no pre-1.0 or deprecated manguito-theme APIs in app/')`.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run --project unit test/unit/libraryMigration.test.ts`
Expected: FAIL, listing at least `app/pages/admin/users.vue` (`:class-name`) and `app/pages/about.vue` (`bg-opacity-75`).

- [ ] **Step 3: Fix each hit**

- `admin/users.vue`: `:class-name="['rounded-lg']"` → `custom-class` (same form as Task 2).
- `about.vue`: `bg-dark-3 … hover:bg-opacity-75` → `hover:bg-dark-3/75`.
- Any other hit: apply the migration guide's rename.

- [ ] **Step 4: Run to verify it passes, then the whole suite**

Run: `pnpm vitest run --project unit test/unit/libraryMigration.test.ts && pnpm lint && pnpm typecheck && pnpm test > .superpowers/t4.log 2>&1; tail -20 .superpowers/t4.log`
Expected: PASS; full suite green (32 + 11 new).

- [ ] **Step 5: Commit**

```bash
git add test/unit/libraryMigration.test.ts app/pages/admin/users.vue app/pages/about.vue
git commit -m "fix(app/): finish the 1.x prop and class renames and guard against old names"
```

### Task 5: Visual walkthrough, docs, PR

**Files:**

- Modify: `CLAUDE.md` (Conventions), maybe `app/components/layout-components/AuthBlock.vue:28`
- Throwaway (scratchpad, never committed): the screenshot script and images

**Interfaces:**

- Consumes: the finished branch.

- [ ] **Step 1: Before/after screenshots on identical data**

Build `master` and this branch, each with `test/test.env` (into separate output dirs, e.g. a `git worktree` of master for the "before" build). Run each against a `mongodb-memory-server` seeded with: one ADMIN, one USER (JWT signed with the test secret, as `test/utils/auth.ts` does), two posts with a comment. Use the Playwright Chromium already cached in `~/.cache/ms-playwright` from a throwaway script in the scratchpad (no project dependency). Capture each at 1280px and 390px width:

- logged out: `/`, `/posts`, a post page, `/about`, `/auth/login`, `/auth/signup`, `/auth/request`;
- USER: `/posts`, a post page, the sidebar open with each account panel open;
- ADMIN: `/posts` with the new-post modal open, `/admin` pages, the user-role modal open;
- an alert showing; keyboard focus (Tab) on a `.btn` and on a sidebar trigger;
- hover on each of the five fade buttons (before vs after).

Expected: before and after match except for intended changes (focus ring style, the accordion/modal now working). List every difference.

- [ ] **Step 2: Production vs branch, logged out**

Screenshot the same logged-out pages on https://manguito-page.bobbykim.dev/ and on the branch's `pnpm dev` (local DB). Compare layout and colors, not content. Check the header's auth block on desktop: `lg:bg-transparent` now applies. If it differs from production, restore production's look in `AuthBlock.vue` and record why.

- [ ] **Step 3: CLAUDE.md**

Add one Conventions bullet: open `Modal`/`Sidebar` through the template ref (`open()`/`close()`), and build collapsibles with `<AccordionGroup>` + `useCollapseTrigger`. Don't use `v-toggle`/`v-collapse`; the theme's background utility is `mcl-bg-*`, so use Tailwind's `bg-<color>/<opacity>` for faded colors. `test/unit/libraryMigration.test.ts` enforces this. Run `pnpm format`.

- [ ] **Step 4: Commit, push, open the PR**

```bash
git add CLAUDE.md app/components/layout-components/AuthBlock.vue
git commit -m "docs(CLAUDE.md): document 1.x dialog and collapse conventions"
git push -u origin chore/12-mcl-upgrade
```

PR body: closes #12, versions table, the fixes, the walkthrough findings (differences list), the `@vueuse/core` peer note, the out-of-scope `className` finding for #19, and owner steps: check the Vercel preview (log in, open the sidebar panels, open the new-post modal, Tab through buttons). Merge with a merge commit.
Expected: CI `lint` and `test` green.
