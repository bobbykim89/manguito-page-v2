# Stores and Composables Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every API action goes through one tested `useApiAction().run`. Stores keep only shared state (session, posts, alerts), page data moves into page composables, and the #15 leftovers are fixed. User-facing behavior stays the same except where the spec says otherwise.

**Architecture:**

- `useApiAction` wraps a call: it shows the success alert, or on failure ends a dead session and alerts the message.
- `userStore` derives `isAuthenticated`, `role`, `isAdmin` and `isManagerOrUp` from `currentUser`.
- `postStore` keeps the list and its mutations. The open post's navigation and a post's comments move into `usePostNavigation` and `usePostComments`.
- `initStore` is deleted, and the init plugin starts both loads itself.

**Tech Stack:** Nuxt 4, Vue 3, Pinia 4 setup stores, ofetch (`$fetch.create`), Vitest with `@nuxt/test-utils` (`mountSuspended`, `registerEndpoint` via `mockApi`).

**Spec:** `docs/superpowers/specs/2026-11-22-stores-composables-design.md`

## Global Constraints

- Every alert text stays word for word, except for two:
  - "No user authentication found, please login" goes away. The server's "No access token found, please log in." takes its place.
  - A validation error with exactly one detail shows that detail's message.
- Kept copy, quoted exactly:
  - Startup and login: "Successfully authenticated user", "Login Successful!", "Signup successful!", "Logout successful!"
  - Account: "Successfully updated username", "Successfully updated user password", "Successfully set user as an admin!"
  - Posts: "Successfully created a new post", "Successfully updated post!", "Successfully deleted post!", "Error: Invalid Post ID " (trailing space)
  - Comments: "Successfully created a comment!", "Successfully deleted a comment!"
  - Admin: "Successfully updated user role"
  - Password reset: "If that email has an account, we've sent a reset link.", "Successfully updated password"
- The startup session check logs a dead session out **quietly**. Actions the user started log out **with** the message. Guards send an expired session on a protected page to `/auth/login?reason=expired`.
- Never resolve a Pinia store after an `await` (SSR cross-request leaks). `useApiAction` resolves `useUserStore()` and `useAlertStore()` synchronously when it's called.
- No new dependency. Posts still all load at startup (paging is #18).
- `test/pages/guards.test.ts` and `test/pages/ssr.test.ts` pass **unchanged**.
- Conventional Commits with a path scope, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Run `pnpm lint` and `pnpm format` before each commit.
- Never use `SKIP_BUILD=1` for an `api` or page run after a server or app change, unless a build has run since.

## Review Focus

1. **Deleting the post you're viewing:** exactly one alert ("Successfully deleted post!") and one navigation to `/posts`, never an extra "Error: Invalid Post ID ". (Test in Task 4.)
2. **A visitor who never logged in triggers an action and gets a 401:** the alert shows, but `sessionExpired` stays `false`, so a protected page then goes to `/`, not `/auth/login?reason=expired`. (Test in Task 3.)
3. **Logging out after an earlier expired session:** `sessionExpired` resets, so the next protected page goes to `/`. (Test in Task 3.)
4. **A caller passing its own `onResponse` to `$api`:** it still gets unwrapped `data` and still sends the token. (Test in Task 2.)
5. **A comment of only spaces:** it isn't sent, and the box keeps the text. (Test in Task 9.)

---

### Task 1: `useApiAction`

**Files:**

- Create: `app/composables/useApiAction.ts`
- Test: `test/unit/useApiAction.test.ts`

**Interfaces:**

- Produces:
  - `useApiAction(): { run: <T>(call: () => Promise<T>, opts?: RunOptions) => Promise<RunResult<T>> }`
  - `RunOptions = { success?: string; quiet?: boolean }`
  - `RunResult<T> = { ok: true; data: T } | { ok: false }`, exported from the same file.
- On failure:
  - `useErrorCheck().isAuthError(err)` → `userStore.expireSession()`, then `alertStore.setAlert(extractMessage(err))` unless `quiet`;
  - any other error → the alert;
  - it never throws.
- On success: `setAlert(success, 'success')` if `success` is given.

- [ ] **Step 1: Write the failing tests.**

  Each test mounts a tiny test component, or runs inside `useNuxtApp().runWithContext`, and uses `mockApi` with `okEnvelope` / `failEnvelope`, calling `$api` inside `run`.

  | Test                                           | Setup                                                                                                                              | Expected                                                                                                      |
  | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
  | `returns the data and shows the success alert` | `okEnvelope({ n: 1 })`, `success: 'Done!'`                                                                                         | `{ ok: true, data: { n: 1 } }`; `alertStore.alertMessage === 'Done!'` and `alertColor === 'success'`          |
  | `shows no alert on success without a message`  | `okEnvelope(1)`, no `success`                                                                                                      | `alertMessage === null`                                                                                       |
  | `alerts a failure and returns ok: false`       | `failEnvelope(e, 'FORBIDDEN', 'Access denied.')`                                                                                   | `{ ok: false }`; `alertMessage === 'Access denied.'`; the session is kept (`userStore.currentUser` unchanged) |
  | `ends a dead session, then alerts`             | `UNAUTHENTICATED` "Session expired, please log in again", with `useAuthToken().value = 'Bearer x'` and `currentUser` patched first | `currentUser === null`, the cookie is `null`, and `alertMessage` is the session copy                          |
  | `quiet: ends a dead session without an alert`  | the same, with `quiet: true`                                                                                                       | `currentUser === null`, `alertMessage === null`                                                               |
  | `never throws`                                 | `call` throws `new Error('boom')`                                                                                                  | resolves `{ ok: false }` and alerts `'boom'`                                                                  |

- [ ] **Step 2: Run and confirm they fail.**

  Run: `pnpm vitest run --project unit test/unit/useApiAction.test.ts`
  Expected: FAIL, "useApiAction is not defined" or a failed import.

- [ ] **Step 3: Implement `useApiAction` in `app/composables/useApiAction.ts`** per the Interfaces block. It resolves both stores at call time, not inside `run`.

- [ ] **Step 4: Run and confirm they pass.**

  Run: `pnpm vitest run --project unit`
  Expected: all PASS.

- [ ] **Step 5: Commit.**

  `feat(app/composables/): useApiAction runs an API call with its alerts and session handling`

---

### Task 2: API client leftovers (2a)

**Files:**

- Modify:
  - `app/plugins/api.plugin.ts`
  - `app/utils/apiError.ts`
  - `app/composables/useErrorCheck.ts`
  - `nuxt.config.ts`
- Test: extend `test/unit/apiClient.test.ts` and `test/unit/errorCheck.test.ts`

**Interfaces:**

- Produces:
  - `toApiError(err)` keeps `err.status`/`err.statusCode` when present; status 0 only when there's no response.
  - `extractMessage` returns `details[0].message` when a `VALIDATION_FAILED` failure has exactly one detail.

- [ ] **Step 1: Write the failing tests.**

  | Test                                                      | File                 | Expected                                                                                                                                                                                                                                                                                    |
  | --------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `a per-call onResponse still gets unwrapped data`         | `apiClient.test.ts`  | `$api('/api/thing', { onResponse: () => { called = true } })` resolves `{ n: 1 }` from `okEnvelope({ n: 1 })`, and `called` is `true`                                                                                                                                                       |
  | `a per-call onRequest still sends the token`              | `apiClient.test.ts`  | with `useAuthToken().value = 'Bearer abc'` and a caller `onRequest`, the handler sees `authorization: 'Bearer abc'`                                                                                                                                                                         |
  | `keeps the real status of a response without an envelope` | `apiClient.test.ts`  | `toApiError(Object.assign(new Error('504'), { status: 504, data: '<html>' }))` has `status: 504`, `code: 'INTERNAL'`; the existing `TypeError` case keeps `status: 0`                                                                                                                       |
  | `shows the one invalid field's message`                   | `errorCheck.test.ts` | `extractMessage(new ApiError(400, 'VALIDATION_FAILED', 'Some fields are invalid.', [{ path: 'text', message: 'Please write a comment.' }]))` equals `'Please write a comment.'`; with two details it stays "Some fields are invalid."; the same rule applies to the `useApi` envelope shape |

- [ ] **Step 2: Run and confirm they fail.**

  Run: `pnpm vitest run --project unit test/unit/apiClient.test.ts test/unit/errorCheck.test.ts`
  Expected: the four new tests FAIL, because the caller's hook replaces the plugin's, the status is 0, and the message is the generic one.

- [ ] **Step 3: Implement.**
  - **`$apiFetch`:** compose the hooks. The plugin's token and unwrap run first, then the caller's. Either wrap `apiFetch` so it merges `opts.onRequest`/`onResponse` with its own, or use hook arrays if the installed ofetch supports them; check its types.
  - **`toApiError`:** keep the real status.
  - **`extractMessage`:** the single-detail rule.
  - **`nuxt.config.ts`:** add `optimization: { keyedComposables: [{ name: 'useApi', argumentLength: 2 }] }`, so each `useApi` call site gets its own key. Verify the option name against the installed Nuxt's schema (`node_modules/@nuxt/schema`). If it differs, ledger a ruling.

- [ ] **Step 4: Run and confirm they pass, plus `pnpm typecheck`.**

  Run: `pnpm vitest run --project unit && pnpm typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit.**

  `fix(app/plugins/): per-call fetch hooks add to the plugin's; keep real statuses; one-field messages`

---

### Task 3: `userStore`

**Files:**

- Modify:
  - `app/stores/userStore.ts`
  - `app/middleware/{adminRoute,authRoute,guestRoute}.ts`
  - every reader of `getCurrentAuthInfo` / `isAuthenticated` / `role` (e.g. `app/pages/posts/[id].vue`, `app/pages/posts/index.vue`, `app/pages/admin/request.vue`, the layouts and `AuthBlock.vue`; `grep -rn "getCurrentAuthInfo\|isAuthenticated\|\brole\b" app`)
- Test: rewrite `test/unit/userStore.test.ts`, and update the patches in `postsPage.test.ts`, `postPage.test.ts` and `postStore.test.ts`

**Interfaces:**

- Consumes: `useApiAction` (Task 1).
- Produces:
  - **`useUserStore()` state:** `currentUser: Ref<UserType | null>`, `sessionExpired: Ref<boolean>`.
  - **Getters (computed):** `isAuthenticated`, `role: UserRoleType | null`, `isAdmin`, `isManagerOrUp`.
  - **Actions:**
    - `ensureAuth(): Promise<void>`
    - `loginWithCredential(AuthInput)`
    - `signupUser(UserInput)`
    - `updateUsername(NewUsernameInput)`
    - `updatePassword(PwUpdateInput)`
    - `setAdmin(SetAdminInput)`
    - `logoutUser(): void`
    - `expireSession(): void`
  - **Removed:** `getCurrentAuthInfo`, `getCurrentUser` (public), `authUser`, `alertNoSession`, `handleAuthError`, and the `isAuthenticated`/`role` refs. Tests set the session by patching `currentUser`.

- [ ] **Step 1: Rewrite `userStore.test.ts`.**

  Keep the existing cases that still hold, renamed where needed:
  - `a 401 from /api/auth logs out quietly`
  - `a 500 from /api/auth still alerts`
  - `ensureAuth calls /api/auth once`
  - `tells the user when an action they started hits an expired session`
  - `makes no request without a cookie` (for `ensureAuth`)
  - `a wrong login only alerts`
  - `a refusal keeps the user logged in`
  - `expireSession logs out and marks the session expired`

  Replace `an action without a session makes no request` with:

  | Test                                                                 | Setup                                                                                                     | Expected                                                                               |
  | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
  | `a 401 without a cookie alerts but doesn't mark the session expired` | no cookie; `PUT /api/user/user-info/username` → `UNAUTHENTICATED` "No access token found, please log in." | that alert, and `sessionExpired === false` (Review Focus 2)                            |
  | `logout clears an earlier expired flag`                              | `expireSession()` with a cookie held, then `logoutUser()`                                                 | `sessionExpired === false`, "Logout successful!" (Review Focus 3)                      |
  | `login clears an earlier expired flag`                               | `sessionExpired = true`, successful login                                                                 | `sessionExpired === false`, `isAuthenticated === true`                                 |
  | `updateUsername uses the response, with no second call`              | the PUT answers `okEnvelope({ ...user, name: 'new' })`, and a `GET /api/auth` handler counts calls        | `currentUser.name === 'new'`; GET count 0; "Successfully updated username"             |
  | `setAdmin sets the user from the response`                           | the PUT answers the user with `role: 'ADMIN'`                                                             | `isAdmin === true`; "Successfully set user as an admin!"                               |
  | `getters follow currentUser`                                         | patch `currentUser` to role MANAGER                                                                       | `isAuthenticated`, `role === 'MANAGER'`, `isManagerOrUp === true`, `isAdmin === false` |

- [ ] **Step 2: Run and confirm they fail.**

  Run: `pnpm vitest run --project unit test/unit/userStore.test.ts`
  Expected: the new cases FAIL (old store shape).

- [ ] **Step 3: Implement the store per the Interfaces block and the spec's action table.**
  - `expireSession()` sets `sessionExpired = true` only if `useAuthToken().value` was set before clearing.
  - `logoutUser`, login and signup reset it to `false`.
  - Update the guards to read `isAuthenticated`, `currentUser` and `sessionExpired` directly, and every other reader.
  - Update the test patches from `isAuthenticated`/`role` to `currentUser`.

- [ ] **Step 4: Run the client tests, the page tests and the typecheck.**

  Run: `pnpm vitest run --project unit && pnpm typecheck && pnpm vitest run --project api test/pages`
  Expected: all PASS, with `test/pages/guards.test.ts` unchanged.

- [ ] **Step 5: Commit.**

  `refactor(app/stores/): userStore derives its session getters and runs actions through useApiAction`

---

### Task 4: `postStore` and `usePostNavigation`

**Files:**

- Create: `app/composables/usePostNavigation.ts`
- Modify:
  - `app/stores/postStore.ts`
  - `app/pages/posts/[id].vue` (navigation, image transition, delete flow)
  - `app/pages/posts/index.vue` (drop `resetCurrent()`)
- Test: rewrite `test/unit/postStore.test.ts`; create `test/unit/usePostNavigation.test.ts`; update `test/unit/postPage.test.ts`

**Interfaces:**

- Consumes: `useApiAction` (Task 1), and `userStore`'s getters (Task 3).
- Produces:
  - **`usePostStore()`:**
    - `posts: Ref<PostType[]>`
    - `getRecentPosts` (first 7)
    - `getAllPosts(): Promise<void>`
    - `createNewPost(form: FormData): Promise<void>`
    - `updatePost(id: string, body: UpdatePostInput): Promise<void>`
    - `deletePostById(id: string): Promise<boolean>`, which returns whether it succeeded, so the page redirects only on success.
    - **Removed:** `currentPost`, `postIdx`, `postLoading`, `setCurrentPost`, `setNextPost`, `setPrevPost`, `resetCurrent`, and the client-side permission checks.
  - `usePostNavigation(postId: MaybeRefOrGetter<string>): { currentPost: ComputedRef<PostType | null>; prevUrl: ComputedRef<string>; nextUrl: ComputedRef<string> }`.

- [ ] **Step 1: Write the failing tests.**

  `usePostNavigation.test.ts` patches `postStore.posts` to three posts `a`, `b`, `c`:

  | Test                                                        | Setup                                | Expected                                                                                                                                     |
  | ----------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
  | `wraps prev and next around the list`                       | id `a`                               | `prevUrl === '/posts/c'`, `nextUrl === '/posts/b'`, `currentPost._id === 'a'`                                                                |
  | `falls back to /posts with no posts`                        | empty list                           | both URLs are `/posts`, and no alert                                                                                                         |
  | `alerts and leaves for an unknown id once posts are loaded` | id `zzz`, fake timers                | `alertMessage === 'Error: Invalid Post ID '`; after 500 ms, a `vi.spyOn(useRouter(), 'push')` (or `navigateTo` mock) is called with `/posts` |
  | `removing the open post from the list does not alert`       | id `a`, then remove `a` from `posts` | no alert, no navigation (Review Focus 1)                                                                                                     |

  `postStore.test.ts`:

  | Test                                             | Expected                                                           |
  | ------------------------------------------------ | ------------------------------------------------------------------ |
  | `create prepends the new post and alerts`        |                                                                    |
  | `update replaces the post in the list`           |                                                                    |
  | `delete removes it and returns true`             |                                                                    |
  | `a refusal only alerts and returns false`        | the list is unchanged                                              |
  | `an expired session logs out and keeps the post` | the existing case                                                  |
  | `no client-side permission check`                | a USER's `deletePostById` still calls the API (the handler is hit) |

  `postPage.test.ts`: `deleting the open post alerts once and goes to /posts`. Confirm is stubbed to `true`, `DELETE` answers `okEnvelope({ id })`. Expect `alertMessage === 'Successfully deleted post!'`, and `push` called once with `/posts`.

- [ ] **Step 2: Run and confirm they fail.**

  Run: `pnpm vitest run --project unit test/unit/usePostNavigation.test.ts test/unit/postStore.test.ts test/unit/postPage.test.ts`
  Expected: FAIL (missing composable, old store shape).

- [ ] **Step 3: Implement.**
  - **The unknown-id check** runs on page open and when `postId` changes, through a `watch` on the id with `immediate`. It never runs on list changes, and only when `import.meta.client`.
  - **"Posts loaded"** means `posts.length > 0`, or a `loaded` flag the store sets after `getAllPosts`. Pick one and keep the test's empty-list case silent.
  - **The post page:**
    - `<Transition mode="out-in">` with the `NuxtImg` keyed by `currentPost?.imageId`, and the spinner branch removed;
    - prev/next push `prevUrl`/`nextUrl`;
    - delete pushes `/posts` only when `deletePostById` returns `true`;
    - `isAdmin` and `isManagerOrUp` come from `userStore`.

- [ ] **Step 4: Run the unit project, the page tests and the typecheck.**

  Run: `pnpm vitest run --project unit && pnpm typecheck && pnpm vitest run --project api test/pages`
  Expected: PASS.

- [ ] **Step 5: Commit.**

  `refactor(app/stores/): postStore keeps the list; usePostNavigation derives the open post`

---

### Task 5: `usePostComments`, and pages on `run`

**Files:**

- Create: `app/composables/usePostComments.ts`
- Modify:
  - `app/pages/posts/[id].vue`
  - `app/pages/admin/{comments,posts,users}.vue`
  - `app/pages/auth/{request,reset-password}.vue`
- Delete: `app/composables/useReportApiError.ts`
- Test:
  - create `test/unit/usePostComments.test.ts`;
  - update `postPage.test.ts`, `adminCommentsPage.test.ts`, `adminUsersPage.test.ts`, `requestPage.test.ts`;
  - add `test/unit/resetPasswordPage.test.ts`.

**Interfaces:**

- Consumes: `useApiAction` (Task 1).
- Produces: `usePostComments(postId: MaybeRefOrGetter<string>): { comments: Ref<CommentType[] | undefined>; addComment(text: string): Promise<void>; removeComment(id: string): Promise<void> }`. Both refresh the list on success.

- [ ] **Step 1: Write the failing tests.**

  `usePostComments.test.ts`:
  - `addComment posts, alerts and reloads`: "Successfully created a comment!", and the GET handler is called twice.
  - `removeComment deletes, alerts and reloads`: "Successfully deleted a comment!".
  - `a failed add alerts and does not reload`.

  `resetPasswordPage.test.ts`: `a successful reset alerts and goes to login`. It shows "Successfully updated password", and `push` is called with `/auth/login`.

  The existing page tests keep their assertions. They now pass only if the pages use `run`: for example, the admin page tests assert no reload after a refusal.

- [ ] **Step 2: Run and confirm the new ones fail.**

  Run: `pnpm vitest run --project unit test/unit/usePostComments.test.ts test/unit/resetPasswordPage.test.ts`
  Expected: FAIL (missing composable; the reset page test may already pass, and if so, ledger it as pinning behavior).

- [ ] **Step 3: Implement.**
  - **`usePostComments`**, and switch the post page's comments to it.
  - **Admin pages:** `const res = await run(() => $api(...), { success? }); if (res.ok) refresh()`. Success copy as today: users "Successfully updated user role", none on the two deletes. Drop their `if (!cookie.value) return`.
  - **Token pages:** use `run` with their success copy, and redirect only on `ok`.
  - **Delete `useReportApiError.ts`,** and make sure `grep -rn useReportApiError app test` is empty.

- [ ] **Step 4: Run the unit project and the typecheck.**

  Run: `pnpm vitest run --project unit && pnpm typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit.**

  `refactor(app/composables/): usePostComments; pages run their API actions through useApiAction`

---

### Task 6: `useAccountSettings` for both layouts

**Files:**

- Create: `app/composables/useAccountSettings.ts`
- Modify: `app/layouts/default.vue`, `app/layouts/admin.vue`
- Test: `test/unit/useAccountSettings.test.ts`

**Interfaces:**

- Consumes: `userStore.updateUsername` and `updatePassword` (Task 3).
- Produces: `useAccountSettings(onDone: () => void): { submitUsername(e: Event, name: string): Promise<void>; submitPassword(e: Event, current: string, next: string): Promise<void> }`. Each one:
  1. calls `e.preventDefault()`;
  2. asks `window.confirm` ('Please confirm username update' / 'Please confirm password update.');
  3. calls the store action only if confirmed;
  4. always calls `onDone()`.

- [ ] **Step 1: Write the failing tests.**

  | Test                                                   | Expected                                                                                                                      |
  | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
  | `confirmed username change calls the store and closes` | `vi.spyOn(window, 'confirm').mockReturnValue(true)`; the store action is called with `{ username: 'new' }`, and `onDone` once |
  | `declined change makes no call but still closes`       |                                                                                                                               |
  | `password change passes both passwords`                | `{ currentPassword, newPassword }`                                                                                            |

- [ ] **Step 2: Run and confirm they fail.**

  Run: `pnpm vitest run --project unit test/unit/useAccountSettings.test.ts`
  Expected: FAIL (missing composable).

- [ ] **Step 3: Implement, and use it in both layouts** with `onDone` closing their sidebar.

- [ ] **Step 4: Run and confirm they pass.**

  Run: `pnpm vitest run --project unit && pnpm typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit.**

  `refactor(app/layouts/): share the account forms through useAccountSettings`

---

### Task 7: Startup without `initStore`

**Files:**

- Delete: `app/stores/initStore.ts`
- Modify: `app/stores/index.ts`, `app/plugins/init.plugin.ts`
- Test: `test/unit/initPlugin.test.ts` (new), or extend `userStore.test.ts`; `test/pages/ssr.test.ts` unchanged

**Interfaces:**

- Consumes: `postStore.getAllPosts` and `userStore.ensureAuth`.
- Produces: the init plugin `{ name: 'stores-init', dependsOn: ['api'] }` runs both with `Promise.all` on `app:created`.

- [ ] **Step 1: Write the failing test.**

  `startup loads posts and checks the session concurrently`: export the plugin's startup function as `startStores(pinia)` from `app/plugins/init.plugin.ts`, or test through the stores. With delayed `GET /api/post` and `GET /api/auth` handlers (each waiting 50 ms) and a cookie set, the total time is under 90 ms, and both stores are filled.

  If timing proves flaky in CI, assert instead that both handlers were entered before either resolved, using a shared latch. Ledger which one you used.

- [ ] **Step 2: Run and confirm it fails.**

  Expected: FAIL (sequential, or the function is missing).

- [ ] **Step 3: Implement.** Delete `initStore`, remove it from `stores/index.ts`, and add `dependsOn: ['api']` and `Promise.all` to the plugin.

- [ ] **Step 4: Run and confirm everything passes.**

  Run: `pnpm vitest run --project unit && pnpm typecheck && pnpm vitest run --project api test/pages`
  Expected: PASS, and `ssr.test.ts` unchanged.

- [ ] **Step 5: Commit.**

  `refactor(app/plugins/): start both stores concurrently; drop the unused initStore`

---

### Task 8: Server leftovers (2b)

**Files:**

- Modify:
  - `server/utils/readContent.util.ts`
  - `shared/models/{user,post,comment,token}.model.ts`
  - `server/controller/user/user.controller.ts`
- Test: extend `test/api/limits.test.ts`; add `test/api/username.test.ts`

- [ ] **Step 1: Write the failing tests.**

  | Test                                                        | Request                                                                                                                    | Expected                                                        |
  | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
  | `counts a caption's line breaks once`                       | MANAGER, multipart caption `'x'.repeat(498) + '\n' + 'x'.repeat(500)` (999 characters with one LF; the browser sends CRLF) | 201, and the stored post's `content` contains no `\r`           |
  | `refuses a whitespace-only name at signup`                  | `name: '   '`                                                                                                              | details `{ path: 'name', message: 'Please enter a username.' }` |
  | `renaming yourself to your current name succeeds unchanged` | `PUT /api/user/user-info/username` with the user's own name                                                                | 200, and `data.name` is that name                               |
  | `renaming to someone else's name still conflicts`           |                                                                                                                            | `CONFLICT`                                                      |

- [ ] **Step 2: Run and confirm they fail.**

  Run: `pnpm vitest run --project api test/api/limits.test.ts test/api/username.test.ts`
  Expected: the CRLF test is stored with `\r` (or refused, if Node's FormData sends CRLF), and the self-rename gets 409. The whitespace-signup test may already pass; if so, ledger it as pinning behavior.

- [ ] **Step 3: Implement.**
  - **`readFormDataText`:** `.replace(/\r\n?/g, '\n')` before the trim and length check.
  - **`updateUsername`:** when the trimmed new name equals the user's current name, return the current user without writing.
  - **Each model:** `Model.on('index', (err) => { if (err) console.error(\`[<model>] index build failed:\`, err) })`.

- [ ] **Step 4: Run and confirm they pass.**

  Run: `pnpm test`
  Expected: PASS.

- [ ] **Step 5: Commit.**

  `fix(server/utils/): count caption line breaks once; self-rename is a no-op; log failed index builds`

---

### Task 9: Whitespace-only input in the forms

**Files:**

- Modify:
  - `app/components/posts/CommentInput.vue`
  - `app/components/posts/ContentBlock.vue`
  - `app/components/layout-components/UpdateUserInfo.vue`
- Test: extend `test/unit/formLimits.test.ts`

- [ ] **Step 1: Write the failing tests.**

  | Test                                                        | Expected                                                                                                                                       |
  | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
  | `a comment of only spaces is not sent and stays in the box` | `'   '` → the submit button is disabled; triggering submit emits no `submit-comment`, and the textarea value is still `'   '` (Review Focus 5) |
  | `a caption edit of only spaces is not saved`                | no `on-save`                                                                                                                                   |
  | `a username of only spaces is not submitted`                | `UpdateUserInfo` emits no `on-username-update`                                                                                                 |

- [ ] **Step 2: Run and confirm they fail.**

  Run: `pnpm vitest run --project unit test/unit/formLimits.test.ts`
  Expected: FAIL. The comment emits and clears, and the others emit.

- [ ] **Step 3: Implement trimmed-empty checks** in the three components' submit guards and disabled states.

- [ ] **Step 4: Run and confirm they pass.**

  Run: `pnpm vitest run --project unit`
  Expected: PASS.

- [ ] **Step 5: Commit.**

  `fix(app/components/): ignore whitespace-only comments, captions and usernames`

---

### Task 10: CLAUDE.md, the full CI set, walkthrough

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md.**
  - **Rewrite the "Client state" bullet:**
    - stores for shared state only (`userStore`, `postStore`, `alertStore`);
    - the getters;
    - startup in `init.plugin.ts`;
    - the `sessionExpired` rules.
  - **Add a "Client layout" bullet** with the conventions from the spec: `stores/` vs `composables/` vs `utils/`, the `use<Thing>` and `<thing>Store` names, page data inline vs in a composable, and `ImageUrl` as the one class in composables.
  - **Replace the `useReportApiError` mention in "Errors"** with `useApiAction().run` and its result shape.
  - **Update the `unit` test line:** patch `currentUser` to set a session.

- [ ] **Step 2: Run the full CI set.**

  Run: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`
  Expected: all PASS.

- [ ] **Step 3: Walk through in `pnpm dev`** (local DB only), with the headless browser:
  - sign up and log in, then log out;
  - expire the session by bumping the user's `tokenVersion` in the local DB, then open `/admin/request` → `/auth/login?reason=expired`;
  - prev/next on a post page (insert two posts directly in the DB, as the #15 walkthrough did);
  - add and delete a comment;
  - as an admin, change a user's role;
  - change the username from the sidebar.

  Then clean up only the records you created.

- [ ] **Step 4: Commit.**

  `docs(CLAUDE.md): document the client layout, useApiAction and the slimmer stores`
