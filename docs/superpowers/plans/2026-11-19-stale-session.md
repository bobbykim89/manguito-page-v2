# Stale Session, Error Page and First-Load Guards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A stale or invalid login logs the visitor out quietly. Protected pages are guarded on the first load, including the server render, and an expired session goes to a login page that explains why. The error page shows the real error.

**Architecture:** The server answers 401 when a token's user is gone. `userStore` gains a memoized `ensureAuth()` and a `sessionExpired` flag, and treats a 401 as a quiet logout. Route guards await `ensureAuth()` instead of skipping until `initStore.isMounted`. `error.vue` reads its `error` prop.

**Planning decision (within the spec's "left to the builder"):** the spec says guards await a memoized `initStores()`. This plan memoizes only the auth part, `userStore.ensureAuth()`, which both `initStores()` and the guards await. Guards need only the login state, and this keeps the posts `useFetch` from being started inside route middleware.

**Tech Stack:** Nuxt 4, Pinia setup stores, Nitro/H3, Vitest (`api` + `unit` projects), mongodb-memory-server.

**Spec:** `docs/superpowers/specs/2026-11-19-stale-session-design.md` (issue #22). Read it first.

## Global Constraints

- Branch `fix/22-stale-session` (exists; the spec is committed on it).
- Exact copy:
  - 401 statusMessage: `Session expired, please log in again`
  - login notice: `Your session expired, please log in again.`
  - 404 body: `This page doesn't exist`
  - 5xx body: `Something went wrong, please try again`
  - error title: `<status> | Manguito Page`
- Expired redirect target: `/auth/login?reason=expired`, exactly.
- No session at all on a protected page keeps today's redirect to `/` with today's alert text.
- `token.controller.ts` keeps its 404. The user-list 404 at `user.controller.ts:186` is unrelated; leave it.
- No store restructuring beyond what's named here (#16). No response envelopes (#15).
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` must pass at the end of every task. Commits use Conventional Commits with a path scope, plus `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A session that expires mid-visit, during client-side navigation** (no reload). `ensureAuth()` is memoized, so a client guard trusts the earlier result until an API call returns 401. Expected: the first 401 from any store action clears state silently and sets `sessionExpired`; the next protected navigation goes to login. Pinned by the `userStore` unit tests (Task 2) and the guard's use of `sessionExpired` (Task 3).
2. **Posts no longer loading on first render** because startup order changed. Expected: `/posts` still server-renders posts. Pinned by a page test that inserts a post (Task 3).
3. **Role edge cases on admin pages.** Expected: a `MANAGER` on `/admin` is redirected to `/`; a logged-in `USER` on `/admin/request` (user-only) gets 200. Pinned in Task 3.
4. **A double "Successfully authenticated user" alert or a double `/api/auth` call** when both the plugin and a guard trigger auth. Expected: one call per app instance. Pinned by the `ensureAuth` unit test (Task 2).
5. **Error page leaking server internals on a 5xx.** Expected: the generic message only. Pinned by the unit test (Task 5).

---

### Task 1: Server answers 401 for a token whose user is gone

**Files:**

- Create: `test/utils/auth.ts`, `test/utils/page.ts`, `test/api/auth.test.ts`
- Modify: `server/controller/auth/auth.controller.ts:29-35`, `server/controller/user/user.controller.ts:243-262` (both `getRawCurrentUserData` and `getCurrentUserData`), `test/pages/ssr.test.ts` (use the shared `page` helper)

**Interfaces:**

- Produces in `test/utils/auth.ts`:
  - `insertUser(role?: 'ADMIN' | 'MANAGER' | 'USER'): Promise<{ id: string; token: string }>`. Inserts straight into the `users` collection via `db()` with a unique email, and signs `{ id }` with `'test-secret'`, `expiresIn: '7d'`. `token` is `Bearer <jwt>`. Default role `USER`.
  - `deleteUser(id: string): Promise<void>`.
- Produces in `test/utils/page.ts`: `page(path: string, token?: string): Promise<{ status: number; location: string | null; html: string; setCookie: string | null }>`. Sends `accept: text/html`, sends the token as the `access_token` cookie (URL-encoded), and uses `redirect: 'manual'`.

- [ ] **Step 1: Write the failing test** in `test/api/auth.test.ts`: `GET /api/auth` with a deleted user's token gives `status === 401`, and `json.statusMessage` (or `json.message`, whichever H3 returns) contains `Session expired, please log in again`. A second test: a live user's token gives 200 with `json._id === id`.
- [ ] **Step 2: Run** `pnpm vitest run --project api test/api/auth.test.ts`. Expected: the deleted-user test FAILS with 404; the live-user test passes.
- [ ] **Step 3: Implement.** In the three methods, change the missing-user `createError` to `status: 401, message: 'Unauthorized', statusMessage: 'Session expired, please log in again'`. Switch `ssr.test.ts` to `test/utils/page.ts`.
- [ ] **Step 4: Run** `pnpm test`. Expected: all pass.
- [ ] **Step 5: Commit.** `fix(server/controller/): answer 401 when a token's user no longer exists`

---

### Task 2: `userStore` — quiet logout, `sessionExpired`, memoized `ensureAuth()`

**Files:**

- Modify: `app/stores/userStore.ts`, `app/stores/initStore.ts`
- Test: `test/unit/userStore.test.ts`

**Interfaces:**

- Produces on `useUserStore()`:
  - `sessionExpired: Ref<boolean>`: state, default `false`.
  - `ensureAuth(): Promise<void>`: runs `getCurrentUser()` at most once per store instance. The promise is kept in a closure variable inside the setup function, **not** in state, so it never serializes.
- `handleAuthError(err)`: when `isAuthError(err)`, clear `currentUser`/`isAuthenticated`/`role` and the cookie, set `sessionExpired = true`, and show **no alert**. Otherwise behave as today (alert with `extractMessage`). `getCurrentUser` keeps clearing the cookie on any error.
- `initStore.initStores()` calls `await userStore.ensureAuth()` in place of `getCurrentUser()`.

- [ ] **Step 1: Write failing unit tests** (`resetState()`, `mockApi`/`clearApiMocks` from `test/unit/helpers.ts`; set the cookie with `useAuthToken().value = 'Bearer stale'`):
  - `a 401 from /api/auth logs out quietly`: mock `GET /api/auth` to set status 401 and throw. After `ensureAuth()`: `isAuthenticated === false`, `currentUser === null`, `sessionExpired === true`, `useAuthToken().value` is nullish, `useAlertStore().alertMessage === null`.
  - `a 500 from /api/auth still alerts`: the mock answers 500 with statusMessage `boom`. Then `alertMessage === 'boom'` and `sessionExpired === false`.
  - `ensureAuth calls /api/auth once`: a counting handler returns a user. Call `await Promise.all([ensureAuth(), ensureAuth()])`, then `await ensureAuth()`. The count is 1 and `isAuthenticated === true`.
  - `no cookie, no request`: with the cookie null, `ensureAuth()` makes 0 calls and `sessionExpired === false`.
- [ ] **Step 2: Run** `pnpm vitest run --project unit test/unit/userStore.test.ts`. Expected: FAIL (`ensureAuth` is not a function).
- [ ] **Step 3: Implement** per Interfaces.
- [ ] **Step 4: Run** `pnpm test`. Expected: all pass.
- [ ] **Step 5: Commit.** `fix(app/stores/): treat 401 as a quiet logout and memoize the startup auth check`

---

### Task 3: Route guards run on first load; expired sessions go to login

**Files:**

- Modify: `app/middleware/adminRoute.ts`, `app/middleware/authRoute.ts`, `app/middleware/guestRoute.ts`
- Test: `test/pages/guards.test.ts`

**Interfaces:**

- Consumes: `userStore.ensureAuth()`, `userStore.sessionExpired` (Task 2); `insertUser`, `deleteUser`, `page` (Task 1).
- Each guard first runs `await useUserStore().ensureAuth()`, then decides. None of them read `initStore.isMounted` anymore.
  - `adminRoute`/`authRoute`, not authenticated: if `sessionExpired`, `navigateTo({ path: '/auth/login', query: { reason: 'expired' } })` with no alert. Otherwise today's alert and `navigateTo('/')`.
  - `adminRoute`, authenticated but `role !== 'ADMIN'`: today's alert and `/`.
  - `guestRoute`, authenticated: today's alert and `/`.

- [ ] **Step 1: Write failing page tests** in `test/pages/guards.test.ts`:
  - deleted user's token: `/admin` gives 302 with `location === '/auth/login?reason=expired'`; `/admin/request` gives the same.
  - deleted user's token: `/` gives 200; `html` contains neither `User not found` nor `Session expired`; `setCookie` contains `access_token=;`.
  - no token: `/admin` gives 302 to `/`.
  - `USER` token: `/admin` gives 302 to `/`, and `/admin/request` gives 200.
  - `MANAGER` token: `/admin` gives 302 to `/`.
  - `ADMIN` token: `/admin` gives 200.
  - `USER` token: `/auth/login` gives 302 to `/`.
  - posts still render: insert a post (`posts` collection, with `imageId`, `content: 'hello manguito'`, `author` set to an inserted user's ObjectId); `/posts` gives 200 and `html` contains `hello manguito`. Delete the post after the test.
- [ ] **Step 2: Run** `pnpm vitest run --project api test/pages/guards.test.ts`. Expected: the redirect tests FAIL (200 where 302 is expected). The "posts still render" and quiet-`/` tests may already pass; they guard against regressions.
- [ ] **Step 3: Implement** per Interfaces. If nothing else reads `initStore.isMounted`, leave it in place anyway (#16 removes it).
- [ ] **Step 4: Run** `pnpm test`. Expected: all pass.
- [ ] **Step 5: Commit.** `fix(app/middleware/): guard protected pages on first load and send expired sessions to login`

---

### Task 4: Login page explains an expired session

**Files:**

- Modify: `app/pages/auth/login.vue` (under the `<h2>Login</h2>`)
- Test: `test/pages/guards.test.ts` (add)

- [ ] **Step 1: Write failing tests:** `/auth/login?reason=expired` gives 200 and `html` contains `Your session expired, please log in again.` inside an element with `role="status"` (assert the substring `role="status"` too). `/auth/login` without the query doesn't contain the text.
- [ ] **Step 2: Run** the file. Expected: the first test FAILS.
- [ ] **Step 3: Implement:** a `<p role="status">` rendered with `v-if="route.query.reason === 'expired'"`. Style it to match the page's text colours (e.g. `text-center mb-sm`).
- [ ] **Step 4: Run** `pnpm test`. Expected: all pass.
- [ ] **Step 5: Commit.** `feat(app/pages/auth/): tell visitors when their session expired`

---

### Task 5: `error.vue` shows the real error

**Files:**

- Modify: `app/error.vue`
- Test: `test/pages/ssr.test.ts` (add), `test/unit/errorPage.test.ts`

**Interfaces:**

- `defineProps<{ error: NuxtError }>()`. Status is `error.statusCode`, defaulting to 500 when missing.
- Heading: the status code.
- Body:
  - 404: `This page doesn't exist`
  - other 4xx: `error.statusMessage`, falling back to `error.message`
  - 5xx: `Something went wrong, please try again`
- Title and `og:title`/`twitter:title`: `<status> | Manguito Page`.
- The "Back to main page" link stays.

- [ ] **Step 1: Write failing tests:**
  - SSR: `/does-not-exist` gives 404, and `html` contains `This page doesn't exist` and `<title>404 | Manguito Page`.
  - Unit: `mountSuspended(ErrorPage, { props: { error: { statusCode: 500, statusMessage: 'mongo exploded at 10.0.0.1' } } })` gives text containing `500` and `Something went wrong, please try again`, and **not** containing `mongo exploded`.
  - Unit: `statusCode: 403, statusMessage: 'Access denied'` gives text containing `403` and `Access denied`.
- [ ] **Step 2: Run** both files. Expected: the unit tests FAIL (the page always shows 404).
- [ ] **Step 3: Implement** per Interfaces.
- [ ] **Step 4: Run** `pnpm test`. Expected: all pass.
- [ ] **Step 5: Commit.** `fix(app/error.vue): show the real error status and a safe message`

---

### Task 6: Docs and PR

**Files:**

- Modify: `CLAUDE.md` (Conventions: Errors, Auth, Client state)

- [ ] **Step 1:** Update `CLAUDE.md` so it states:
  - a missing user answers 401 `Session expired, please log in again`
  - `userStore` treats 401 as a quiet logout and sets `sessionExpired`
  - guards `await userStore.ensureAuth()` and work during the server render
  - an expired session on a protected page goes to `/auth/login?reason=expired`
  - `error.vue` shows the real status
  - remove the `isMounted` gate sentence
- [ ] **Step 2: Verify:** `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`. Expected: all pass.
- [ ] **Step 3: Commit.** `docs(CLAUDE.md): document session expiry and first-load guards`
- [ ] **Step 4:** Push, then open a PR to `master` titled `fix: quiet logout for stale sessions, first-load guards, real error page (#22)`. The body has:
  - `Closes #22`
  - a summary of the reproduction findings
  - the behaviour table: what each kind of visitor sees on public, user-only, admin and guest pages
  - a note that the original "404, then home" sequence couldn't be reproduced, and the likely explanation
  - the attribution line

  The owner merges with a merge commit.

- [ ] **Step 5:** Run `gh pr checks <pr> --watch`. Expected: `lint` and `test` pass. Then update issue #22's body: replace "Leads (unconfirmed)" with the confirmed findings, and tick the checklist.
