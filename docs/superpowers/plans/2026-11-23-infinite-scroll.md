# Infinite Scroll with Server Paging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Page `/api/post` by cursor, load the `/posts` grid on scroll with loading/end/empty/error states, give the post page its own single-post endpoint with prev/next ids, and return to the same grid position from a post. This is issue #18.

**Architecture:**

- **Server:** `postController` gains `getPostPage` (cursor paging on `date desc, _id desc`) and `getPostWithNeighbours`. Both share the `olderThan`/`newerThan` filters in `server/utils/postCursor.util.ts`.
- **Shared list:** `postStore` holds the paged list for `/posts` and `/admin/posts` (loaded once per app instance, hydrated from SSR) and the grid's remembered scroll offset.
- **Grid status:** a `LoadMoreStatus` component watches a sentinel with `useIntersectionObserver`.
- **Post page:** `usePost` loads one post.
- **Scrolling:** `app/router.options.ts` adds one rule to Nuxt's default scroll behaviour.

**Tech Stack:** Nuxt 4, Vue 3, Pinia 4 (setup stores), Nitro/H3 1.15 (`getValidatedQuery`), Mongoose 9, Zod 4, `@vueuse/core` (`useIntersectionObserver`), Vitest (`api` and `unit` projects).

**Spec:** `docs/superpowers/specs/2026-11-23-infinite-scroll-design.md`

## Global Constraints

**Code conventions (CLAUDE.md):**

- API routes are thin (`defineApiRoute({ handler })`). Logic lives in `postController`.
- Errors are thrown with `apiError(code, message)`. Messages are user-facing sentences.
- Query DTOs live in `shared/dto/post/`.
- Every client API action runs through `useApiAction().run(...)` (or `useApi` for SSR page data).
- **Never resolve a store after an `await`.**
- Browser-only APIs are guarded with `import.meta.client` (or run only in hooks that don't run in SSR).

**Server queries:**

- No `.lean()` on the paged list or the single post: `author` is populated. `.lean()` is fine on `select('_id')` neighbour lookups.
- No new database indexes.
- Sort is always `{ date: -1, _id: -1 }` for "newest first". Its exact reverse, `{ date: 1, _id: 1 }`, is used for the newer neighbour.
- `limit` is an integer 1–50, default 30.

**Copy, verbatim:**

- "Please ask for between 1 and 50 posts."
- "This list position isn't valid, please reload the page."
- "This post doesn't exist."
- "Loading more photos…"
- "Loaded N more photos." (N is the number added)
- "That's every photo of Manguito!"
- "No photos yet."
- "Couldn't load more photos."
- "Try again"

**Process:**

- Prettier style (single quotes, no semicolons). Run `pnpm lint` and `pnpm format` before each commit.
- Commits use Conventional Commits with a path scope and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- After adding a composable (Task 5's `usePost`), clear `node_modules/.cache/nuxt` and `node_modules/.vitest-cache` before running the unit project.
- Don't use `SKIP_BUILD=1` after any server or app change unless a build ran since.
- The walkthrough uses `pnpm dev` with the local DB only. Seed with `mongosh` and fake `imageId`s, never upload or delete through Cloudinary, and clean up only the seeded records.

## Review Focus

1. **An error on a later page doesn't loop.** With the sentinel still in view after a failed `loadMore`, the grid waits for **Try again**. It never re-requests by itself. Pinned in Task 4 ("does not retry by itself after an error").
2. **A first visit to `/posts` makes no client request for page one after hydration.** `loaded` comes over in the Pinia payload. Pinned in Task 3 ("loadFirstPage loads once") and checked in the Task 7 walkthrough's network count.
3. **Editing a post reached by prev/next that isn't in the loaded list:** the list is left alone, and the page shows the new caption. Pinned in Task 3 ("updatePost leaves a list without that post alone") and Task 5 ("saving an edit shows the new caption").
4. **Opening a post from a shared link, then the X:** the grid starts at the top with page one (there's no remembered offset). Pinned in Task 6 ("post → grid with no remembered offset goes to the top").
5. **Posts with the same `date` straddling a page boundary** appear exactly once, in `_id` order. Pinned in Task 2 ("pages ties on date by \_id").

---

### Task 1: Single post with neighbours (`GET /api/post/:id`)

**Files:**

- Create: `server/utils/postCursor.util.ts`, `server/api/post/[id]/index.get.ts`, `test/api/postNeighbours.test.ts`
- Modify: `server/controller/post/post.controller.ts`, `shared/types/model-dto.types.ts`, `test/utils/content.ts`

**Interfaces:**

- Produces:
  - `olderThan(date: Date, id: Types.ObjectId): FilterQuery` and `newerThan(date: Date, id: Types.ObjectId): FilterQuery`.
    - `olderThan` is `{ $or: [{ date: { $lt: date } }, { date, _id: { $lt: id } }] }`; `newerThan` mirrors it with `$gt`.
    - Both are auto-imported in `server/`.
  - `postController.getPostWithNeighbours(e)`.
  - Shared type `PostWithNeighbours = { post: PostType; prevId: string; nextId: string }`, exported from `#shared/types`.
  - Test helper `insertPosts(authorId: string, count: number, opts?: { date?: Date; sameDate?: boolean }): Promise<string[]>`.
    - It returns ids **newest first**.
    - Dates step down 1 s from `opts.date ?? new Date()`, or are all `opts.date` when `sameDate` is true. In that case it returns the ids sorted by `_id` descending.

- [ ] **Step 1: Write the failing tests** in `test/api/postNeighbours.test.ts`. Use `beforeEach(clearContent)`, `insertUser('MANAGER')` for an author, and `insertPosts(id, 3)` → `[a, b, c]` (a newest).

  | Test                                   | Request                           | Assert                                                               |
  | -------------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
  | `returns the post with its neighbours` | `GET /api/post/${b}`              | 200; `data.post._id === b`, `data.prevId === a`, `data.nextId === c` |
  | `wraps at the newest and the oldest`   | `GET` a, then c                   | for a: `prevId === c`; for c: `nextId === a`                         |
  | `a lone post is its own neighbour`     | one post `p`                      | `prevId === p && nextId === p`                                       |
  | `answers 404 for an unknown id`        | `GET /api/post/${new ObjectId()}` | `expectApiError(res, 'NOT_FOUND', "This post doesn't exist.")`       |
  | `answers 400 for a malformed id`       | `GET /api/post/not-an-id`         | `expectApiError(res, 'VALIDATION_FAILED', 'That id is not valid.')`  |
  | `leaves out author emails`             | `GET` b                           | `Object.keys(data.post.author).sort()` equals `['_id', 'name']`      |

- [ ] **Step 2: Run** `pnpm vitest run --project api test/api/postNeighbours.test.ts`. Expected: FAIL. The 404s come from the `[...]` catch-all, and `insertPosts` is undefined.

- [ ] **Step 3: Implement.**
  - **The filters:** `postCursor.util.ts` with `olderThan`/`newerThan`.
  - **The route:** `index.get.ts` is `defineApiRoute({ handler: postController.getPostWithNeighbours })`.
  - **The controller method:**
    1. `parseObjectId(getRouterParam(e, 'id'))`.
    2. `findById(...).populate('author', 'name')`, with no lean. If it's missing, throw `apiError('NOT_FOUND', "This post doesn't exist.")`.
    3. `next = findOne(olderThan(post.date, post._id)).sort({ date: -1, _id: -1 }).select('_id').lean()`. If there's none, use `findOne({}).sort({ date: -1, _id: -1 })` (the newest).
    4. `prev = findOne(newerThan(...)).sort({ date: 1, _id: 1 })`. If there's none, use `findOne({}).sort({ date: 1, _id: 1 })` (the oldest).
    5. Return `{ post, prevId: String(prev._id), nextId: String(next._id) }`.
  - **The type and helper:** add `PostWithNeighbours` and `insertPosts`.

- [ ] **Step 4: Run** the same command. Expected: PASS (6 tests).

- [ ] **Step 5: Commit**
  ```bash
  git add server/utils/postCursor.util.ts "server/api/post/[id]/index.get.ts" server/controller/post/post.controller.ts shared/types/model-dto.types.ts test/utils/content.ts test/api/postNeighbours.test.ts
  git commit -m "feat(server/controller/): a single post with its prev/next ids, wrapping at both ends"
  ```

### Task 2: Paged list (`GET /api/post?limit&cursor`)

**Files:**

- Create: `shared/dto/post/post-page-query.dto.ts`, `test/api/postPage.test.ts`
- Modify: `shared/dto/post/index.ts`, `server/utils/postCursor.util.ts`, `server/controller/post/post.controller.ts`, `server/api/post/index.get.ts`, `shared/types/model-dto.types.ts`, `test/api/post.test.ts`

**Interfaces:**

- Consumes: `olderThan` (Task 1), `insertPosts` (Task 1).
- Produces:
  - **The query DTO:** `postPageQuerySchema` (Zod) with `limit` (coerced int, 1–50, default 30, every failure message "Please ask for between 1 and 50 posts.") and `cursor` (optional string matching `/^\d{1,15}_[0-9a-f]{24}$/`, message "This list position isn't valid, please reload the page.").
    - Also export `POST_PAGE_SIZE = 30` and `type PostPageQuery`.
  - **The cursor codec:** `encodePostCursor({ date, _id }): string` (`${date.getTime()}_${_id}`) and `decodePostCursor(cursor: string): { date: Date; id: Types.ObjectId }`.
  - **The controller method:** `postController.getPostPage(e)` answers `PostPage = { posts: PostType[]; nextCursor: string | null }`. The shared type is exported from `#shared/types`.
  - **`getAllPost` is removed.** `GET /api/post` now answers `PostPage`.
  - **Note:** from this commit until Task 3 the client still expects an array. Tasks 2 and 3 land back to back; the suite stays green because the unit tests mock the API.

- [ ] **Step 1: Write the failing tests** in `test/api/postPage.test.ts` (with `beforeEach(clearContent)`). `page(q)` is `api('GET', '/api/post' + q)`, and `ids` come from `insertPosts`, newest first.

  | Test                                                        | Setup → request                                                                          | Assert                                                                                                              |
  | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
  | `returns an empty page from an empty database`              | none → `''`                                                                              | `data` equals `{ posts: [], nextCursor: null }`                                                                     |
  | `returns the 30 newest first with a cursor when more exist` | 31 posts → `''`                                                                          | `posts.map(_id)` equals `ids.slice(0, 30)`; `typeof nextCursor === 'string'`                                        |
  | `continues from the cursor without overlap`                 | 31 → page 1, then `?cursor=${nextCursor}`                                                | page 2 ids equal `[ids[30]]`; `nextCursor === null`                                                                 |
  | `gives exactly 30 posts one page`                           | 30 → `''`                                                                                | 30 posts, `nextCursor === null`                                                                                     |
  | `honours limit`                                             | 10 → `?limit=7`                                                                          | 7 posts, `nextCursor` is a string                                                                                   |
  | `pages ties on date by _id`                                 | 5 posts with `{ date: d, sameDate: true }` → walk `?limit=2` until `nextCursor === null` | the concatenated ids equal the 5 ids sorted by `_id` descending (no repeats)                                        |
  | `skips posts created after the first page`                  | 31 → page 1; `insertPosts(id, 1)` (newest); page 2                                       | page 2 ids equal `[ids[30]]`; union of pages has 31 unique ids                                                      |
  | `survives deleting the cursor's post`                       | 31 → page 1; delete `ids[29]` from `posts`; page 2                                       | page 2 ids equal `[ids[30]]`                                                                                        |
  | `refuses a bad limit` (each of `0`, `51`, `abc`)            | `?limit=<v>`                                                                             | `expectApiError(res, 'VALIDATION_FAILED')`; `error.details[0].message === 'Please ask for between 1 and 50 posts.'` |
  | `refuses a malformed cursor`                                | `?cursor=nope`                                                                           | `details[0].message === "This list position isn't valid, please reload the page."`                                  |

  In `test/api/post.test.ts`:
  - delete the old `returns an empty list from an empty database`;
  - change `lists posts without author emails` to read `res.json.data.posts[0].author`.

- [ ] **Step 2: Run** `pnpm vitest run --project api test/api/postPage.test.ts test/api/post.test.ts`. Expected: FAIL (`data` is an array).

- [ ] **Step 3: Implement.**
  - **DTO:** `post-page-query.dto.ts`, exported from `shared/dto/post/index.ts`.
  - **Cursor codec:** `encodePostCursor`/`decodePostCursor` in `postCursor.util.ts`.
  - **`getPostPage`:**
    1. `const { limit, cursor } = await getValidatedQuery(e, postPageQuerySchema.parse)`.
    2. Filter with `cursor ? olderThan(...decodePostCursor(cursor)) : {}`.
    3. `.sort({ date: -1, _id: -1 }).limit(limit + 1).populate('author', 'name')`.
    4. `nextCursor` is `encodePostCursor(last kept)` when more than `limit` came back, else `null`.
  - **The route:** point `index.get.ts` at `postController.getPostPage`, and delete `getAllPost`.

- [ ] **Step 4: Run** the same command. Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add shared/dto/post server/utils/postCursor.util.ts server/controller/post/post.controller.ts server/api/post/index.get.ts shared/types/model-dto.types.ts test/api/postPage.test.ts test/api/post.test.ts
  git commit -m "feat(server/controller/): page GET /api/post by a date+id cursor, newest first"
  ```

### Task 3: `postStore` paging, startup, home, and the consumers of the list

**Files:**

- Modify:
  - `app/stores/postStore.ts`
  - `app/plugins/init.plugin.ts`
  - `app/pages/index.vue`
  - `app/pages/posts/index.vue`
  - `app/pages/admin/posts.vue`
  - `test/unit/postStore.test.ts`, `test/unit/initPlugin.test.ts`, `test/unit/postsPage.test.ts`
- Create: `test/unit/homePage.test.ts`, `test/unit/adminPostsPage.test.ts`

**Interfaces:**

- Consumes: `PostPage` (Task 2).
- Produces (`usePostStore`):
  - **State:**
    - `posts: Ref<PostType[]>`
    - `nextCursor: Ref<string | null>`
    - `status: Ref<PostListStatus>`, where `type PostListStatus = 'idle' | 'loading' | 'error' | 'done'` is exported from the store file
    - `loaded: Ref<boolean>` (page one has arrived)
  - **`loadFirstPage(): Promise<void>`:** a no-op when `loaded` or `status === 'loading'`.
    - It calls `run(() => $api<PostPage>('/api/post'))`.
    - On success it **replaces** `posts`, sets `nextCursor`, `loaded = true`, and `status = nextCursor ? 'idle' : 'done'`.
    - On failure it sets `status = 'error'`.
  - **`loadMore(): Promise<void>`:** a no-op unless `loaded && nextCursor && status !== 'loading'`.
    - It calls `run(() => $api<PostPage>('/api/post', { query: { cursor } }))`.
    - On success it appends, skipping `_id`s already present, and updates `nextCursor`/`status`.
    - On failure it sets `status = 'error'`.
  - **`retry(): Promise<void>`:** `loaded ? loadMore() : loadFirstPage()`.
  - **`createNewPost`:** unchanged (prepend).
  - **`updatePost(postId, payload): Promise<PostType | null>`:** returns the updated post, and replaces it in `posts` only if present.
  - **`deletePostById`:** unchanged (returns a boolean, removes the post if present).
  - **Removed:** `getAllPosts` and `getRecentPosts`.
  - **Startup:** `startStores({ userStore }): Promise<void>` runs only `userStore.ensureAuth()`. The plugin no longer resolves `postStore`.

- [ ] **Step 1: Write the failing tests.**

  **`postStore.test.ts`:** replace the `getAllPosts` tests. Pages are `okEnvelope({ posts, nextCursor })`.
  - **`loadFirstPage loads once`:** two calls (and a call after success) → one `GET /api/post`. `posts` equals the page, and `loaded` is true.
  - **`loadFirstPage marks done when there is no cursor`:** `status === 'done'`.
  - **`loadMore appends the next page`:** page 1 `[p1]` with cursor `'c1'`, then page 2 `[p2]` with `null` → `posts` ids `['p1', 'p2']`, `status === 'done'`, and the second request's query has `cursor === 'c1'`.
  - **`loadMore ignores calls while loading`:** two concurrent `loadMore()` → one request.
  - **`loadMore skips ids already in the list`:** page 2 contains `p1` again → `p1` appears once.
  - **`a failed loadMore sets error and retry recovers`:** `failEnvelope(e, 'INTERNAL', ...)` → `status === 'error'`, alert set. Mock success, then `retry()` → appended, status leaves `error`.
  - **`a failed first page retries the first page`:** `retry()` calls `GET /api/post` without a cursor.
  - **`updatePost leaves a list without that post alone`:** `posts` is `[p1]`, update `p9` → returns the updated post, and `posts` is unchanged.
  - Keep the existing create/update/delete tests, adapted.

  **`initPlugin.test.ts`:** replace the concurrency test with `startup checks the session and loads no posts`. Mock `/api/auth` → user, and count `GET /api/post` calls. After `startStores({ userStore })`: `isAuthenticated` is true and the post count is `0`.

  **`homePage.test.ts`:** `asks for the 7 newest posts`. Mock `GET /api/post`, capturing `getQuery(e).limit`; it answers `{ posts: [post], nextCursor: 'x' }`. Mount `@/pages/index.vue` → captured `limit === '7'`.

  **`adminPostsPage.test.ts`:** `deleting a post removes it from the shared list`.
  1. Admin session, and `postStore` patched with `posts: [p1, p2], loaded: true, status: 'done'`.
  2. `vi.stubGlobal('confirm', () => true)`, and mock `DELETE /api/post/p1` → ok.
  3. Mount `@/pages/admin/posts.vue` and click p1's delete button → the store's `posts` ids are `['p2']`.

  **`postsPage.test.ts`:** the `GET /api/post` mock answers `okEnvelope({ posts: [], nextCursor: null })`. Add `renders the first page's tiles`: two posts → two links to `/posts/<id>`, and no "Load More" button.

- [ ] **Step 2: Run** `pnpm vitest run --project unit`. Expected: the new and changed tests FAIL (`loadFirstPage` is not a function, and so on).

- [ ] **Step 3: Implement.**
  - **The store and startup:** as in Interfaces.
  - **Home:** `const { data } = await useApi<PostPage>('/api/post', { query: { limit: 7 } })`, and `<AsyncGrid :cards="data?.posts ?? []" />`.
  - **The posts grid:**
    - `await postStore.loadFirstPage()` in setup (resolve the stores first);
    - render `posts` keyed by `post._id`;
    - delete `postPerLoad`, `numPostsDisplayed`, `numberOfLoads`, `displayedPost`, `onLoadMore`, `showLoadMore` and the button.
  - **`/admin/posts`:**
    - rows come from `postStore.posts`, with `await postStore.loadFirstPage()` in setup;
    - `onDelete` keeps the confirm, then `await postStore.deletePostById(id)`;
    - drop its `useApi`, `$api` and `run`.

- [ ] **Step 4: Run** `pnpm vitest run --project unit`, then `pnpm test`. Expected: all green. `test/pages/guards.test.ts` "still server-renders posts" still passes, because page one is in the SSR payload.

- [ ] **Step 5: Commit**
  ```bash
  git add app/stores/postStore.ts app/plugins/init.plugin.ts app/pages/index.vue app/pages/posts/index.vue app/pages/admin/posts.vue test/unit
  git commit -m "feat(app/stores/): postStore loads the post list a page at a time; startup only checks the session"
  ```

### Task 4: `LoadMoreStatus`, the sentinel and its states, on `/posts` and `/admin/posts`

**Files:**

- Create: `app/components/posts/LoadMoreStatus.vue`, `test/unit/loadMoreStatus.test.ts`
- Modify: `app/pages/posts/index.vue`, `app/pages/admin/posts.vue`

**Interfaces:**

- Consumes: `usePostStore()`'s `posts`, `status`, `loaded`, `nextCursor`, `loadMore` and `retry` (Task 3).
- Produces: `<LoadMoreStatus />`. It takes no props, reads the store, and is placed after the tiles or rows.

  **The sentinel:**
  - `<div ref="sentinel" aria-hidden="true">`, observed with `useIntersectionObserver(sentinel, cb, { rootMargin: '0px 0px 100% 0px' })` into a local `inView` ref.
  - A `watch([inView, status])` calls `loadMore()` when `inView && status === 'idle' && loaded && nextCursor`. Because the watch also fires when `status` returns to `'idle'`, a still-visible sentinel loads again. Because it only fires on `'idle'`, an error never retries by itself.

  **The visible line** (class `text-center`, below the grid):

  | State                | Shows                                                                                              |
  | -------------------- | -------------------------------------------------------------------------------------------------- |
  | `loading`            | "Loading more photos…"                                                                             |
  | `done` with posts    | "That's every photo of Manguito!"                                                                  |
  | `done` with no posts | "No photos yet."                                                                                   |
  | `error`              | "Couldn't load more photos." and a `<button type="button">Try again</button>` that calls `retry()` |
  | `idle`               | nothing                                                                                            |

  **The live region:** `<p role="status" aria-live="polite" class="sr-only">{{ announcement }}</p>`.
  - The announcement starts empty and isn't set during SSR or on mount.
  - On a change to `loading` it becomes "Loading more photos…".
  - After a load adds N > 0 posts it becomes "Loaded N more photos.", plus " That's every photo of Manguito!" when `done`.
  - On `error` it becomes "Couldn't load more photos.".

- [ ] **Step 1: Write the failing tests** in `loadMoreStatus.test.ts`.
  - **Setup:** mount with `mountSuspended(LoadMoreStatus)` after patching the Nuxt-app Pinia's `postStore`. Stub `IntersectionObserver` with `vi.stubGlobal` as a fake class that records its callback, and add a helper `setInView(true | false)` that invokes it with `[{ isIntersecting }]`.
  - **`shows the loading line`:** with `status: 'loading'` → the text contains "Loading more photos…".
  - **`shows the end line when done with posts`:** "That's every photo of Manguito!".
  - **`shows the empty line when done with no posts`:** "No photos yet.".
  - **`shows the error line and retries`:** with `loaded: true, nextCursor: 'c', status: 'error'` → "Couldn't load more photos.". Click "Try again" → `GET /api/post` with `cursor=c` is called, and the posts grow.
  - **`loads more when the sentinel comes into view`:** `loaded`, `idle`, cursor `'c'` → `setInView(true)` → one request with `cursor=c`.
  - **`keeps loading while the sentinel stays in view`:** page answers cursor `'c2'`, then `null`. One `setInView(true)` → two requests, and `status === 'done'`.
  - **`does not retry by itself after an error`:** the first request fails, and the sentinel stays in view. Flush → exactly one request, and `status === 'error'`.
  - **`announces how many photos a load added`:** after a load returning 5 posts, `[role="status"]` reads "Loaded 5 more photos.".
  - **`announces nothing on mount`:** `[role="status"]` is empty.

- [ ] **Step 2: Run** `pnpm vitest run --project unit test/unit/loadMoreStatus.test.ts`. Expected: FAIL (the component is missing).

- [ ] **Step 3: Implement** the component, and place `<LoadMoreStatus />` after the grid (spanning all columns, `col-span-3`) in `posts/index.vue` and after the rows in `admin/posts.vue`. Import it explicitly, as the post page imports its components.

- [ ] **Step 4: Run** `pnpm vitest run --project unit`. Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add app/components/posts/LoadMoreStatus.vue app/pages/posts/index.vue app/pages/admin/posts.vue test/unit/loadMoreStatus.test.ts
  git commit -m "feat(app/components/): load the next page near the bottom, with loading, end, empty and retry states"
  ```

### Task 5: The post page loads its own post (`usePost`)

**Files:**

- Create: `app/composables/usePost.ts`, `test/unit/usePost.test.ts`
- Modify: `app/pages/posts/[id].vue`, `test/unit/postPage.test.ts`, `test/pages/ssr.test.ts`
- Delete: `app/composables/usePostNavigation.ts`, `test/unit/usePostNavigation.test.ts`

**Interfaces:**

- Consumes:
  - `GET /api/post/:id` → `PostWithNeighbours` (Task 1);
  - `postStore.updatePost` → `PostType | null` (Task 3);
  - `postStore.deletePostById`.
- Produces: `usePost(postId: MaybeRefOrGetter<string>): Promise<{ post: Ref<PostType>; prevUrl: ComputedRef<string>; nextUrl: ComputedRef<string> }>`.
  - It uses `useApi<PostWithNeighbours>(() => `/api/post/${toValue(postId)}`)`.
  - `prevUrl`/`nextUrl` are `/posts/<prevId>` and `/posts/<nextId>`.
  - **On error:** a status of 400 or 404 throws `createError({ statusCode: 404, statusMessage: "This post doesn't exist.", fatal: true })`. Any other status throws `createError({ statusCode: <status || 500>, fatal: true })`.

- [ ] **Step 1: Write the failing tests.**

  **`usePost.test.ts`** (call the composable directly, as `usePostComments.test.ts` does):
  - **`gives the post and its neighbour urls`:** mock → `{ post, prevId: 'p0', nextId: 'p2' }` → `post.value._id === 'p1'`, `prevUrl.value === '/posts/p0'`, `nextUrl.value === '/posts/p2'`.
  - **`turns a 404 into a fatal 404`:** it rejects with `statusCode: 404` and `fatal: true`.
  - **`turns a 400 into a fatal 404`:** the same.

  **`postPage.test.ts`:**
  - replace `usePostStore(pinia).$patch({ posts: [post] })` with `mockApi('GET', '/api/post/p1', () => okEnvelope({ post, prevId: 'p0', nextId: 'p2' }))`;
  - keep the comment and delete tests;
  - add **`prev and next go to the server's neighbours`:** with `router.push` spied, clicking `button[aria-label="previous post"]` → `{ path: '/posts/p0' }`, and "next post" → `{ path: '/posts/p2' }`;
  - add **`saving an edit shows the new caption`:** as the author (patch `currentUser._id` to `post.author._id`), stub confirm to true, and mock `PUT` → `{ ...post, content: 'new words' }`. Emit `on-save` from `ContentBlock` → the page text contains "new words". The store list stays empty, so this also covers Review Focus 3.

  **`test/pages/ssr.test.ts`:**
  - change **`renders a post page with a bad id without a server error`** to **`answers 404 for a malformed post id`**: `status === 404`, and the html matches the 404 message regex;
  - add **`answers 404 for an unknown post id`**: a random ObjectId, with the same assertions;
  - add **`server-renders a post`**: insert a post (as `guards.test.ts` does) → 200, and the html contains its caption. Delete the post in `finally`.

- [ ] **Step 2: Run.**
  1. `rm -rf node_modules/.cache/nuxt node_modules/.vitest-cache`.
  2. `pnpm vitest run --project unit test/unit/usePost.test.ts test/unit/postPage.test.ts`.

  Expected: FAIL (`usePost` is not defined).

- [ ] **Step 3: Implement** `usePost`, and change the post page:
  - **Loading:** `const [{ post, prevUrl, nextUrl }, { comments, addComment, removeComment }] = await Promise.all([usePost(id), usePostComments(id)])`. Both start before any `await`. The page's stores stay resolved at the top.
  - **Reads:** every `currentPost` read becomes `post`. Drop the `currentPost === null` spinner branch.
  - **The image:** remove the `<Transition>` wrapper, keeping the `NuxtImg`.
  - **Saving an edit:** `const updated = await postStore.updatePost(id, { content: text }); if (updated) post.value = updated`.
  - **Clean up:** delete `usePostNavigation.ts` and its test, then clear the caches again.

- [ ] **Step 4: Run** the unit command, then `pnpm test`. Expected: all green.

- [ ] **Step 5: Commit**
  ```bash
  git add -A app/composables "app/pages/posts/[id].vue" test/unit test/pages/ssr.test.ts
  git commit -m "feat(app/pages/): the post page loads its own post and neighbours; an unknown id is a 404"
  ```

### Task 6: Return to the same grid position from a post

**Files:**

- Create: `app/utils/gridScroll.ts`, `app/router.options.ts`, `test/unit/gridScroll.test.ts`
- Modify: `app/stores/postStore.ts` (add `gridScrollTop`), `app/pages/posts/index.vue`, `test/unit/postsPage.test.ts`

**Interfaces:**

- Consumes: `usePostStore()` (Task 3).
- Produces:
  - `postStore.gridScrollTop: Ref<number | null>`, initially `null`.
  - In `app/utils/gridScroll.ts`:
    - `isPostPath(path: string): boolean`, which is `/^\/posts\/[^/]+\/?$/`;
    - `scrollTarget(to: { path: string; hash: string }, from: { path: string }, savedPosition: { left: number; top: number } | null, gridScrollTop: number | null): { left: number; top: number } | { el: string } | null`.
  - **`scrollTarget` rules, in order:**
    1. `savedPosition` when set.
    2. `{ left: 0, top: gridScrollTop }` when `to.path` (trailing slash stripped) is `/posts`, `isPostPath(from.path)`, and `gridScrollTop !== null`.
    3. `{ el: to.hash }` when there's a hash.
    4. `{ left: 0, top: 0 }`.
  - **`app/router.options.ts`:** a copy of Nuxt's default `scrollBehavior` (`node_modules/nuxt/dist/pages/runtime/router.options.js`).
    - Keep its same-path hash branch, its `scrollToTop` meta check, its `START_LOCATION` branch, and its wait on `page:loading:end` plus `nuxtApp['~transitionPromise']` and `requestAnimationFrame`.
    - Its `_calculatePosition` delegates to `scrollTarget(to, from, savedPosition, usePostStore().gridScrollTop)`. Resolve the store synchronously at the top of `scrollBehavior`.
    - It adds the hash margin and `behavior` when the result is `{ el }`.

- [ ] **Step 1: Write the failing tests.**

  **`gridScroll.test.ts`:**

  | Test                                                    | Call                                                                        | Expect                  |
  | ------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------- |
  | `a saved position wins`                                 | to `/posts`, from `/posts/a`, saved `{left:0,top:50}`, grid `900`           | `{ left: 0, top: 50 }`  |
  | `post → grid returns the remembered offset`             | to `/posts`, from `/posts/a`, `null`, `900`                                 | `{ left: 0, top: 900 }` |
  | `post → grid with no remembered offset goes to the top` | to `/posts`, from `/posts/a`, `null`, `null`                                | `{ left: 0, top: 0 }`   |
  | `another page → grid goes to the top`                   | to `/posts`, from `/about`, `null`, `900`                                   | `{ left: 0, top: 0 }`   |
  | `a hash scrolls to its element`                         | to `/about#team` (hash `#team`), from `/`, `null`, `null`                   | `{ el: '#team' }`       |
  | `isPostPath`                                            | `/posts/abc` → true; `/posts` and `/posts/` → false; `/admin/posts` → false |                         |

  **`postsPage.test.ts`:**
  - **`remembers the scroll position when leaving for a post`:** mount at `/posts`, `window.scrollTo(0, 400)` (or define `scrollY` with `Object.defineProperty`), then `await useRouter().push('/posts/p1')` → `postStore.gridScrollTop === 400`.
  - **`leaving for another page leaves it alone`:** push `/about` → it stays `null`.

- [ ] **Step 2: Run** `pnpm vitest run --project unit test/unit/gridScroll.test.ts test/unit/postsPage.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement:**
  - the util;
  - `gridScrollTop` in the store;
  - in `posts/index.vue`, `onBeforeRouteLeave((to) => { if (isPostPath(to.path)) postStore.gridScrollTop = window.scrollY })`, where `postStore` is resolved at the top of setup;
  - `app/router.options.ts`.

- [ ] **Step 4: Run** `pnpm vitest run --project unit`, then `pnpm test`. Expected: all green.

- [ ] **Step 5: Commit**
  ```bash
  git add app/utils/gridScroll.ts app/router.options.ts app/stores/postStore.ts app/pages/posts/index.vue test/unit/gridScroll.test.ts test/unit/postsPage.test.ts
  git commit -m "feat(app/): coming back from a post returns to the same place on the grid"
  ```

### Task 7: CLAUDE.md and the walkthrough

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md.**
  - **Client state:**
    - `postStore` holds the paged post list (`posts`, `nextCursor`, `status`, `loaded`, `loadFirstPage`, `loadMore`, `retry`) and `gridScrollTop`;
    - `init.plugin` runs only `userStore.ensureAuth()`.
  - **Client layout:** `usePost` replaces `usePostNavigation` in the page-data list.
  - **Conventions:** add one line. `GET /api/post` pages by an opaque `date_id` cursor (`limit` 1–50, default 30, newest first). `GET /api/post/:id` answers `{ post, prevId, nextId }` with wrap-around.
  - **The scroll rule:** add a line on `app/router.options.ts`'s grid-return rule.

- [ ] **Step 2: Verify.** Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test`. Expected: all clean.

- [ ] **Step 3: Walkthrough.** Use `pnpm dev` with `pnpm db:local:up`, and a playwright-core script in the scratchpad.
  1. **Seed:**
     - one ADMIN user, created through the signup API, then given the role with `mongosh`;
     - 70 posts by that user, through `mongosh` `insertMany`, with `imageId: 'walk/none<i>'`, `content: 'walk post <i>'`, dates 1 s apart, and `updatedAt`.

     Record the ids.

  2. **Check:**
     1. A first load of `/posts` makes no client `GET /api/post` before scrolling, and 30 tiles render.
     2. Scrolling to the end loads 70 unique tiles, then shows "That's every photo of Manguito!".
     3. Scroll down, open a tile around position 35, and press Back. `scrollY` is within 5 px of before, with the same tile count.
     4. Repeat with the X, then with the backdrop. Repeat with "next" twice and then the X.
     5. The header's "Posts" link from `/about` lands at `scrollY === 0`.
     6. On the newest post, prev goes to the oldest (`walk post 0`).
     7. Opening `/posts/<random ObjectId>` directly answers status 404 and shows "This page doesn't exist".
     8. Keyboard: focus the last tile and press Tab, and more tiles appear.
  3. **Clean up:** delete only the seeded user and the posts whose ids were recorded.

- [ ] **Step 4: Commit**
  ```bash
  git add CLAUDE.md
  git commit -m "docs(CLAUDE.md): document the paged post list, usePost and the grid scroll rule"
  ```
