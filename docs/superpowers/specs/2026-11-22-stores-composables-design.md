# Stores and composables refactor (issue #16)

## Why

Issue #16 asks to "cut duplication and make frontend data flow easier to follow and test". It names four things:

- move the shared fetch, error and alert logic into composables;
- slim the stores to state plus domain actions;
- document the folder and naming conventions in CLAUDE.md;
- test the new composables.

The leftovers carried from #15 (parts 2a and 2b) ride along.

Today (master at `df16908`):

- **Error handling exists three times.** There's `handlePostError` in `postStore`, `handleAuthError` in `userStore` and `useReportApiError()` for pages. Every store action repeats the same steps: check the cookie, call `$api`, update state, show a success alert, catch.
- **Pages repeat it too.**
  - The post page handles comments itself.
  - The three admin pages and the two token pages (`auth/request`, `auth/reset-password`) each write try → `$api` → success alert → `refresh()` → catch by hand.
  - The two layouts (`default`, `admin`) have identical username and password handlers.
- **`postStore` repeats the server's permission rules.** It checks role and authorship before each call. Since #15 the server answers those with clear 403s, and the UI already hides the buttons.
- **There's dead or duplicated state:**
  - `authUser` and `getCurrentUser` are near-copies;
  - `logoutUser` and `expireSession` both clear the session;
  - `isAuthenticated` and `role` are separate refs that must be kept in step with `currentUser`;
  - `postIdx`, `currentPost` and `resetCurrent` track the open post in the shared store;
  - `setPostLoadnigTimeout` (sic) fakes 500 ms of loading;
  - `setNextPost`/`setPrevPost` carry commented-out old code;
  - `initStore` has two flags (`loading`, `isMounted`) that nothing reads.
- **#18 is next.** It replaces how posts load (today everything loads at startup), so this refactor keeps `getAllPosts`' behavior and only tidies around it.

## Goals

1. **One way to run an API action:** `useApiAction().run(...)`. It calls, shows the success alert, and on failure alerts the server's message and ends the session when the server says it's gone. Stores, page composables and pages all use it.
2. **Stores hold only state shared across pages** (the owner's choice), with domain actions that are "call, update state". Data one page uses lives in that page or a page composable.
3. **The open post's navigation** (current, previous, next) is derived from the post list in a composable, not tracked in the shared store.
4. **The same behavior users have today**, except where this document says otherwise. That covers every alert text, the session-expiry flows and the guards.
5. **CLAUDE.md states the conventions:** what goes in `stores/`, `composables/` and `utils/`, how names are formed, and how to call the API.
6. **Tests for every new composable**, with the existing store, page and guard tests updated to match.
7. **The carried-over leftovers are fixed** (listed below).

## Non-goals

- How posts load: all at startup, as today. Pagination and infinite scroll are #18.
- A data-fetching library (Pinia Colada, TanStack Query). If one is worth it, #18 decides, with paging in view.
- New UI, new copy, or accessibility work (#14).
- Hydration fixes (#19), beyond not adding new mismatches.

## Anti-goals

These would make it a failure even if the tests pass:

- **An alert's wording changes,** or an action that alerted no longer does (or the reverse). The only exceptions are listed below.
- **The session flows regress:**
  - a dead session at startup must still log out **quietly**;
  - an action the user started must still log out **with** the message;
  - protected pages must still send an expired session to `/auth/login?reason=expired`.
- **Server rendering shares state between requests.** That includes a composable resolving a store through a global Pinia during SSR.
- **The SSR payload grows** with page-only data, or new hydration mismatches appear.

## Approaches

**Where data lives** (owner picked the first):

1. **Stores for shared state, composables for page data (chosen).**
2. **Everything through stores**, with comment and admin stores. Rejected: single-page data would stay in memory and in the SSR payload after you leave the page.

**The shared action helper** (owner picked the first):

1. **A small `useApiAction()` composable (chosen).** One tested unit, no dependency.
2. **One handler per store, with try/catch kept in each action.** Rejected: pages keep their copies.
3. **A data library.** Rejected: a new dependency and mental model, and it overlaps #18.

## Design

### Conventions (they go into CLAUDE.md)

- **`app/stores/`** holds Pinia setup stores, only for state several pages share:
  - `userStore` holds the session;
  - `postStore` holds the post list;
  - `alertStore` holds the alert banner.

  Files are named `<thing>Store.ts`, exporting `use<Thing>Store`. Actions call the API through `useApiAction` and update state. Stores don't repeat the server's permission rules.

- **`app/composables/`** holds `use<Thing>` functions that need the Nuxt context:
  - the API client pieces (`useApi`, `useApiAction`, `useErrorCheck`, `useAuthToken`);
  - reusable view logic (`useImageUrl.ts`, which exports the `ImageUrl` class: it reads `useRuntimeConfig()`, so it needs the Nuxt context and stays here unchanged; CLAUDE.md names it as the one class among the composables);
  - page data (`usePostComments`, `usePostNavigation`, `useAccountSettings`).

  A page keeps its own data inline when it's a single list plus an action or two (the admin pages). It moves to a composable when it carries logic worth testing, or when two places share it.

- **`app/utils/`** holds pure functions and classes, with no Nuxt context (`apiError.ts`, `passwordRule.ts`).

### `useApiAction()`

```ts
const { run } = useApiAction()
const res = await run(
  () => $api<PostType>('/api/post', { method: 'POST', body }),
  {
    success: 'Successfully created a new post', // optional success alert
    quiet: false, // true: a dead session logs out without an alert (startup check only)
  },
)
if (!res.ok) return
posts.value = [res.data, ...posts.value]
```

- `run<T>(call: () => Promise<T>, opts?: { success?: string; quiet?: boolean }): Promise<{ ok: true; data: T } | { ok: false }>`.
- On failure:
  - `isAuthError(err)` → `userStore.expireSession()`, then the alert, unless `quiet`;
  - any other error → the alert `extractMessage(err)`;
  - in both cases it returns `{ ok: false }` and never throws.
- On success: `alertStore.setAlert(success, 'success')` when `success` is given, then `{ ok: true, data }`.
- **It must work inside `userStore`'s own setup, and never resolve a store after an `await`.** It calls `useUserStore()` and `useAlertStore()` once, synchronously, when `useApiAction()` is called. Pinia 4 registers a store before running its setup (`pinia._s.set` precedes `setup()`), so inside `userStore`'s setup that returns the store being built, with no recursion. Elsewhere it resolves through the component's injected Pinia. It must never call `useUserStore()` from an async continuation, which is how SSR requests would leak into each other.
- `useReportApiError()` is removed. Its callers use `run`.

### `userStore`

- **State:** `currentUser: UserType | null` and `sessionExpired: boolean`.
- **Getters:**
  - `isAuthenticated` (`currentUser !== null`);
  - `role` (`currentUser?.role ?? null`);
  - `isAdmin`;
  - `isManagerOrUp`.

  Pages and guards read these directly. `getCurrentAuthInfo` goes away.

- **Actions:**

  | Action                | Calls                                                                                                                       | On success                                           | Alert copy (unchanged)               |
  | --------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------ |
  | `ensureAuth()`        | the startup check, at most once per app instance, as today: skips the call without a cookie, `GET /api/auth`, `quiet: true` | sets `currentUser`                                   | "Successfully authenticated user"    |
  | `loginWithCredential` | `POST /api/auth`                                                                                                            | stores the cookie, then loads `/api/auth`            | "Login Successful!"                  |
  | `signupUser`          | `POST /api/user`                                                                                                            | stores the cookie, then loads `/api/auth`            | "Signup successful!"                 |
  | `updateUsername`      | `PUT /api/user/user-info/username`                                                                                          | sets `currentUser` from the response, no second call | "Successfully updated username"      |
  | `updatePassword`      | `PUT /api/user/user-info/password`                                                                                          | no state change, no second call                      | "Successfully updated user password" |
  | `setAdmin`            | `PUT /api/user/admin`                                                                                                       | sets `currentUser` from the response                 | "Successfully set user as an admin!" |
  | `logoutUser()`        | none                                                                                                                        | clears the session                                   | "Logout successful!"                 |
  | `expireSession()`     | none                                                                                                                        | clears the session, sets `sessionExpired`            | none                                 |

  `logoutUser()` and `expireSession()` share one private clear step.

- **`sessionExpired` (my call; today it is sticky, a latent bug):**
  - `expireSession()` sets it only when a session cookie was actually held. Otherwise a visitor who never logged in would land in the "session expired" flow after their first 401, now that the client's no-cookie checks are gone.
  - `logoutUser()` and a successful login or signup reset it to `false`. Then a deliberate logout followed by a protected page goes to `/` with the usual alert, not to `/auth/login?reason=expired`.
  - The guards read it exactly as today, so `guards.test.ts` passes unchanged. The store tests pin both resets.
- **The "no cookie" pre-checks before actions go away.** Without a token the server answers 401 `UNAUTHENTICATED` "No access token found, please log in.", and `run` handles it like any dead session (logout plus that message). This replaces the old client text "No user authentication found, please login". `ensureAuth` keeps its no-cookie skip, so anonymous visits don't make a pointless request.

### `postStore`

- **State:** `posts: PostType[]`. **Getter:** `getRecentPosts` (first 7, unchanged).
- **Actions:**

  | Action                 | Calls                  | On success                     | Alert copy (unchanged)            |
  | ---------------------- | ---------------------- | ------------------------------ | --------------------------------- |
  | `getAllPosts()`        | `useApi`, unchanged    |                                | alerts on failure, as today       |
  | `createNewPost(form)`  | `POST /api/post`       | prepends the new post          | "Successfully created a new post" |
  | `updatePost(id, body)` | `PUT /api/post/:id`    | replaces the post in the list  | "Successfully updated post!"      |
  | `deletePostById(id)`   | `DELETE /api/post/:id` | removes the post from the list | "Successfully deleted post!"      |

- **Removed:**
  - the client-side role and authorship checks, and the "Unauthorized…" errors they threw (the server decides);
  - `currentPost`, `postIdx`, `postLoading`, `resetCurrent`, `setCurrentPost`, `setNextPost`, `setPrevPost`;
  - the fake loading timer.

### `usePostNavigation(postId: MaybeRefOrGetter<string>)`

It returns `currentPost` (computed from `postStore.posts`), `prevUrl` and `nextUrl`. Those are computed `/posts/<id>` paths that wrap around the list, as today, and fall back to `/posts` when the list is empty.

**The unknown-id check (my call):**

- **When it runs:** when the page opens a post, and when `postId` changes. It never runs just because the list changed, so deleting the open post doesn't add an "Error: Invalid Post ID " alert. The page's own redirect after a delete stays the only navigation.
- **What it does:** if the posts are loaded and the id isn't among them, it alerts "Error: Invalid Post ID ", with today's copy (trailing space included), and navigates to `/posts` after today's 500 ms delay.
- **Where it runs:** only in the browser (`import.meta.client`). Today the server render also scheduled that `setTimeout(navigateTo)`, which fired after the response, outside any request. On a first load the browser runs the check during hydration, so people see the same alert and redirect as today.
- **Startup:** it must not fire while the list is still empty during startup.

**The post page:**

- `postStore.setCurrentPost`/`setNextPost`/`setPrevPost` are replaced by this composable, and its prev/next buttons push `prevUrl`/`nextUrl`.
- **My call:** the image keeps its out-in `<Transition>`, now keyed by `currentPost.imageId` instead of the fake `postLoading` timer. Switching posts still fades between images, without the forced 500 ms spinner.
- `posts/index.vue`'s `postStore.resetCurrent()` call goes away.

### `usePostComments(postId: MaybeRefOrGetter<string>)`

It returns `comments` (from `useApi` on `/api/comment/:postId`), `addComment(text)` and `removeComment(id)`. Each action runs through `run` and refreshes the list on success, with today's copy: "Successfully created a comment!" and "Successfully deleted a comment!". The post page uses it. The page's own `isAuthor` computed stays, since it depends on the post. `isAdmin` and `isManagerOrUp` come from `userStore`.

### Other pages and layouts

- **Admin pages** (`comments`, `posts`, `users`) keep `useApi` for their list. Each action becomes `run(() => $api(...), { success })` followed by `refresh()` on `ok`. Success copy is unchanged: users "Successfully updated user role", and none on the two deletes, as today. Their `if (!cookie.value) return` pre-checks go away, for the same reason as the stores'.
- **`auth/request.vue` and `auth/reset-password.vue`** use `run`, with unchanged copy ("If that email has an account, we've sent a reset link.", "Successfully updated password") and the same redirects on success.
- **`useAccountSettings(onDone: () => void)`** holds the two layouts' identical username and password handlers. It returns `submitUsername(e, name)` and `submitPassword(e, current, next)`, which keep the confirm prompts and close through `onDone`. Both layouts use it.

### Startup

- `initStore` is deleted.
- `app/plugins/init.plugin.ts` declares `dependsOn: ['api']`. On `app:created` it runs `postStore.getAllPosts()` and `userStore.ensureAuth()` concurrently (`Promise.all`); today they run one after the other. **My call:** nothing depends on their order, and the server render waits for both either way.
- The guards keep `await userStore.ensureAuth()` and read `isAuthenticated`, `currentUser` and `sessionExpired` directly.

### Leftovers from #15

**Client (2a):**

1. **`useApi` call sites stop sharing an automatic key.** Add `useApi` to `optimization.keyedComposables` in `nuxt.config.ts`, so Nuxt keys each call site separately the way it does for `useFetch`.
2. **The init plugin `dependsOn: ['api']`** (above).
3. **The stale "quiet:" comment in `userStore`** goes away with the rewrite.
4. **A caller's own `onRequest`/`onResponse` passed to `$api`/`$apiFetch` runs in addition to** the plugin's token header and envelope unwrapping, never instead of them. Today a per-call hook replaces the plugin's.
5. **`toApiError` keeps the real HTTP status** of a failed response that has no envelope (a 504 from a proxy is `status: 504`). Status 0 is only for a request that got no response.

**Client and server (2b review):** 6. **Whitespace-only input:**

- The comment, caption-edit and username forms treat trimmed-empty input as empty: no submit, and the comment box isn't cleared.
- **My call:** when a `VALIDATION_FAILED` error has exactly one `details` entry, `extractMessage` returns that entry's message instead of "Some fields are invalid.", so single-field forms show the sentence the user can act on.

7. **`readFormDataText` normalizes `\r\n` to `\n`** before trimming and measuring. Browsers send multipart newlines as CRLF, which made the server count each line break twice.
8. **Each model logs a failed index build:** `Model.on('index', (err) => err && console.error(...))`, naming the model.
9. **An API test for a whitespace-only name at signup.**
10. **Renaming yourself to your current name succeeds without a change.** It returns the user with "Successfully updated username"; today it answers `CONFLICT`.

## Testing

**Unit project:**

- **`useApiAction`:**
  - success with and without an alert;
  - a failure alerts;
  - `UNAUTHENTICATED` expires the session, then alerts;
  - `quiet` expires the session without an alert;
  - it never throws.
- **`usePostNavigation`:**
  - prev/next wrap around;
  - an empty list falls back to `/posts`;
  - an unknown id alerts and redirects only once the posts are loaded;
  - removing the open post from the list doesn't alert;
  - nothing is scheduled during the server render.
- **`userStore`'s `sessionExpired`:** a 401 without a held cookie leaves it `false`, and logout and login reset it.
- **`usePostComments`:** adding and removing refresh the list and alert.
- **`useAccountSettings`:** confirm declined → no call, and `onDone` always runs.
- **`userStore` and `postStore`:** the action table above, the getters, quiet startup, and no client-side permission throws.
- **`$api`:**
  - a per-call `onResponse` still gets unwrapped data;
  - `toApiError` keeps 504;
  - `extractMessage` returns the single-detail message.
- **The existing page tests** (`postPage`, `postsPage`, `adminCommentsPage`, `adminUsersPage`, `requestPage`, `updateUserInfo`, `formLimits`) are updated to the new store shape. They patch `currentUser` instead of `isAuthenticated`/`role`.

**API project:**

- the whitespace-only signup name;
- the self-rename no-op;
- a CRLF caption of 999 visible characters with line breaks is accepted, and is stored with `\n`.

**Page project:** `guards.test.ts` and `ssr.test.ts` pass unchanged, which shows the guards and SSR are untouched.

**Walkthrough** in `pnpm dev` (local DB):

- log in and out;
- an expired session on a protected page;
- prev/next on a post page;
- add and delete a comment;
- an admin role change;
- the username change from the sidebar.

## Left to the builder

- The internal file layout of each composable, and the type names of `run`'s result.
- How `usePostNavigation` tells "posts not loaded yet" apart from "the id doesn't exist" (for example, the startup having finished vs `posts.length > 0`), as long as the unit test pins both cases.
- How `$apiFetch` composes per-call hooks with the plugin's (wrapping in `$api`, or ofetch hook arrays if the installed ofetch supports them).
- Whether `useErrorCheck`'s single-detail rule lives in `extractMessage` or in `toApiError`.
