# Infinite scroll with server paging (issue #18)

## Why

Issue #18: "Let visitors browse every photo without clicking 'load more'."

Its checklist:

- the first 30 posts load in the tile grid, rendered on the server;
- the next 30 load automatically near the bottom, until the last post;
- no duplicate or skipped posts when new posts are added mid-session;
- loading and end-of-list states, and an error state with a retry;
- the scroll position is restored when returning from a post;
- keyboard users can reach the new items, and loading is announced to screen readers.

Two items carried over from #16 belong here too:

- an unknown post id doesn't redirect when the post list is empty or failed to load;
- deleting from `/admin/posts` leaves the shared list stale.

### Today (master at `cdfcc0b`)

- **Every post loads at startup.**
  - `app/plugins/init.plugin.ts` calls `postStore.getAllPosts()` (`GET /api/post`, no limit; production has 169 posts) on every first load.
  - The whole list ships in the SSR payload of every page.
- **The posts grid** (`app/pages/posts/index.vue`) slices that list 30 at a time behind a "Load More" button.
  - Its counter is local to the page, so coming back from a post resets it to 30, and the scroll position is lost.
  - Tiles are keyed by index.
- **The post page** (`app/pages/posts/[id].vue`) finds its post in the list through `usePostNavigation`.
  - It computes prev/next by position, wrapping at both ends.
  - An id missing from a non-empty list alerts "Error: Invalid Post ID " and redirects to `/posts`.
  - There is no endpoint that returns a single post.
- **The home page** shows `postStore.getRecentPosts` (the first 7).
- **`/admin/posts`** fetches the whole list itself with `useApi('/api/post')`. Its deletes call `$api` directly and `refresh()`, so the shared list keeps the deleted post.
- **Server.** `postController.getAllPost` returns every post, sorted `date: -1`, with `author` populated (`name`). There's a non-unique index on `posts.date`. `GET /api/post/trimmed` exists, and the app doesn't use it.

## Approaches

The owner picked **B**.

- **A. Keep loading every post at startup, and reveal them on scroll.** Only the grid changes, and mid-session duplicates can't happen. But the full list still ships on every page load and grows with every post. The bad-id case would also still need a "finished loading" patch.
- **B. Page on the server (chosen).**
  - `GET /api/post` returns 30 at a time, continuing from a cursor.
  - The post page gets its own post and its neighbours from a new single-post endpoint.
  - The home page asks for 7, and startup stops loading posts.

  It matches the issue's checklist, which assumes a paged API. It makes a bad id a plain server 404. It also stops the payload growing.

## Goals

1. **`GET /api/post` is paged by cursor,** newest first. The first page is rendered on the server.
2. **The grid loads the next page about a screen before the bottom,** until the end. It shows loading, end-of-list, empty and error-with-retry states.
3. **No repeats or gaps** when posts are created or deleted between page loads.
4. **Coming back from a post** shows the same loaded photos, at the same scroll position. That covers the browser's Back button, and also the post page's own exits: the close X and the backdrop click. It holds even after several prev/next clicks. This is the owner's choice (option B).
5. **The post page loads only its own post,** with prev/next ids from the server.
   - Prev/next still wrap: the newest post's prev is the oldest post, and the oldest post's next is the newest.
   - Each click fetches one post. The grid's loaded pages are never involved.
6. **An unknown, deleted or malformed post id shows the 404 error page,** with a real 404 status, both on a first load and on client-side navigation.
7. **Admin deletes and post-page edits and deletes keep the shared list current.**
8. **Accessibility:**
   - new tiles follow the old ones in tab order, and focus doesn't move;
   - loading, loaded, end and error are announced through a polite live region.
9. **Tests cover the API and the client,** and CLAUDE.md describes the new post loading.

## Non-goals

- New visual design for the grid or the post page, beyond the three status lines and the retry button.
- Growing the grid as you click prev/next on a post. The owner agreed the grid only grows by scrolling.
- Refreshing a loaded list to pick up other people's new posts. A reload does that, as the startup load did before.
- Accessibility fixes outside the new states: tile `alt` text, `role="submit"` and the wrong aria-labels belong to #14.
- The hydration warning and the post page's `og:image` (#19), and upload errors (#17).
- Changing or removing `GET /api/post/trimmed`.
- New database indexes.

## Anti-goals

These would make it a failure even if the tests pass:

- **A post appears twice in the grid, or one never appears,** while posts are created or deleted between page loads.
- **The grid or the post page needs a second request after hydration** to show what the server already rendered (a double fetch, or a flash of the spinner).
- **The SSR payload of pages other than `/posts` and `/admin/posts` carries a post list.** The home page carries only its 7.
- **A store is resolved after an `await`,** or list state is shared between SSR requests.
- **Prev/next on a post page triggers loading grid pages.**

## Constraints

- **The project's conventions (CLAUDE.md):**
  - thin API routes, with logic in `postController`;
  - query and body validation through Zod DTOs in `shared/dto/post/`;
  - errors via `apiError` with the existing codes;
  - client calls through `$api`/`useApi` and `useApiAction().run`;
  - stores only for shared state;
  - browser-only APIs guarded.
- **No `.lean()` on the paged list or the single post.** `author` is populated from users, and production has old users without schema defaults.
- **Use the existing `posts.date` index.** Production has 169 posts, so tie-breaking on `_id` in memory is fine.
- **Every post has a stored `date`.** The owner's `scripts/check-db.ts` runs against production and dev (2026-11-21) both reported "every posts doc has date". That matters because a post read without a stored `date` would get "now" from the schema default, and its cursor would repeat posts. New posts always get one on create.
- **`@vueuse/core` is already a dependency.** Its `useIntersectionObserver` is available.
- **The deploy changes `GET /api/post`'s response shape.** A tab left open across the deploy may show an empty or broken grid until it's reloaded. The owner accepted this, as with #15's envelope change. There are no other consumers. The PWA precaches only static assets, and SSR pages aren't served from its cache.

## Design

### API

**`GET /api/post?limit=<n>&cursor=<c>`** answers `data: { posts: PostType[], nextCursor: string | null }`.

- **Order:** `date` descending, then `_id` descending as the tie-break.
- **`limit`:** an integer from 1 to 50, default 30.
- **`cursor`:** omitted for the first page. Otherwise it's the value of `nextCursor` from the previous page.
- **`nextCursor`** encodes the last returned post's `date` and `_id`.
  - It's an opaque string to the client. The format is the builder's call, e.g. `<epoch ms>_<id>`.
  - The next page is the posts strictly after it in the sort order: `date < d`, or `date == d` and `_id < id`.
  - The cursor carries the date itself, so it stays valid if that post is deleted. Posts created after the first page sort before the cursor and never show up in later pages, so there are no repeats.
- **The last page** returns `nextCursor: null`. If a page comes back with exactly `limit` posts, the server checks whether any remain (for example, by fetching `limit + 1`), so the client never makes a request that returns nothing.
- **A bad query** answers 400 `VALIDATION_FAILED` through a Zod query DTO (`shared/dto/post/`), read with h3's validated-query helper or the equivalent.
  - The messages are user-facing sentences: `limit` gets "Please ask for between 1 and 50 posts.", and a malformed `cursor` gets "This list position isn't valid, please reload the page."
- **The posts** keep today's shape: `author` populated with `name` only, and no emails.

**`GET /api/post/:id`** (new: `server/api/post/[id]/index.get.ts`) answers `data: { post: PostType, prevId: string, nextId: string }`.

- **`:id` is checked with `parseObjectId`.** A malformed id gets 400 `VALIDATION_FAILED` "That id is not valid."
- **An unknown id** gets 404 `NOT_FOUND` "This post doesn't exist."
- **`nextId`** is the next older post (same order as the list). If there's none, it wraps to the newest post.
- **`prevId`** is the next newer post. If there's none, it wraps to the oldest post.
- **With a single post,** both are its own id.
- **Each neighbour is one `findOne`** sorted on `date`/`_id` with `select('_id')`. A wrap is one more `findOne` for the newest or oldest post.

New shared types in `shared/types`:

- `PostPage = { posts: PostType[]; nextCursor: string | null }`
- `PostWithNeighbours = { post: PostType; prevId: string; nextId: string }`

### Client state: `postStore`

`postStore` holds the paged list the grid and `/admin/posts` share. It's loaded once per app instance and kept across navigation, which is what restores the grid when you come back.

- **State:**
  - `posts: PostType[]`
  - `nextCursor: string | null`
  - `status: 'idle' | 'loading' | 'error' | 'done'`, where `done` means the end was reached.
- **`loadFirstPage()`** loads page one, unless it's already loaded or loading.
  - It's awaited in the `setup` of `/posts` and `/admin/posts`, so the server renders it.
  - Pinia state hydrates on the client, so the client doesn't load it again.
- **`loadMore()`** loads the page after `nextCursor`.
  - It does nothing while a load is in flight, after `done`, or before the first page.
  - It appends, skipping any `_id` already in the list.
  - A failure sets `status: 'error'`. Retrying calls `loadMore()` again.
- **Failures go through `run`.** They alert like every other action, and the grid also shows its inline error and retry. This is my call; see "Calls I made".
- **`createNewPost`, `updatePost` and `deletePostById`** keep their current behaviour: prepend, replace if present, and remove if present.
  - `/admin/posts` deletes through `postStore.deletePostById`. That fixes the carried-over stale list.
- **Removed:** `getAllPosts` and `getRecentPosts`.

**Startup.** `init.plugin.ts` only runs `userStore.ensureAuth()`. Posts no longer load there, so `startStores` shrinks or goes.

### The grid: `/posts`

- **Tiles** come from `postStore.posts` and are keyed by `post._id`.
- **After the tiles** comes one shared component (e.g. `app/components/posts/LoadMoreStatus.vue`; the name is the builder's call). `/admin/posts` uses it too. It holds:
  - **a sentinel element** observed with `useIntersectionObserver`, with a bottom root margin of about one viewport. When it comes into view, it calls `loadMore()`. If the sentinel is still in view after a page lands (a tall screen), it loads again, until it's out of view or the list is done.
  - **the visible status line**, by state:

    | State               | Text                                                                                                                      |
    | ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
    | loading             | "Loading more photos…"                                                                                                    |
    | done, with posts    | "That's every photo of Manguito!"                                                                                         |
    | done, with no posts | "No photos yet."                                                                                                          |
    | error               | "Couldn't load more photos." and a **Try again** button that calls `loadMore()` (or `loadFirstPage()` if page one failed) |

  - **a polite live region** (`aria-live="polite"`) that announces "Loading more photos…", "Loaded N more photos.", the end text and the error text.
- **Focus doesn't move when tiles are added.** Tabbing past the last tile scrolls the sentinel into view and loads more, and the new tiles follow in tab order.
- **No IntersectionObserver** (SSR, or a browser without it): the status line still renders. The Try-again button shows only in the error state. The builder may add a visible "Load more" button as a fallback in the browser if the observer is missing.
- **The "Load More" button and its counters are removed.**
- **The new-post modal is unchanged.**

### Scroll restoration

The owner chose that every way back from a post returns to the same place on the grid. The list surviving navigation makes the tiles come back. The scroll position needs its own handling, because:

- the close X (`NuxtLink to="/posts"`) and the backdrop click (`router.push('/posts')`) are new navigations, which Nuxt scrolls to the top;
- after prev/next, the history entry right behind the post page is another post, not the grid.

**What's built:**

- **Remember the position.** `postStore` gets `gridScrollTop: number | null`. When the grid page is left for a post page (`/posts/:id`), it saves `window.scrollY` there. It's set only in the browser, never on the server. Leaving for anywhere else doesn't change it.
- **A custom `app/router.options.ts` `scrollBehavior`.** It replaces Nuxt's default, so it keeps the default's behaviour:
  - a hash scrolls to its element;
  - otherwise it goes to the top;
  - scrolling waits until the page transition has finished (`out-in`), as Nuxt's default does.

  Its rules, in order:
  1. **Back/forward with a saved position:** restore that position, as today.
  2. **To `/posts` from a `/posts/:id` page, with a remembered `gridScrollTop`:** restore it. That covers the X, the backdrop, and Back after prev/next steps.
  3. **Anything else:** the default. The header's "Posts" link from another page, the home page's links and a first load all start at the top.

- **No remembered position** (for example, the post was opened from a shared link and the grid was never visited in this session): the X goes to the top of a freshly loaded grid.
- **The restore needs the tiles to be there.** They are, because the list is kept in the store. If the remembered position is further down than the page is tall, the browser clamps it, and the sentinel then loads more as usual.
- **The decision is a pure helper,** for example `gridReturnPosition(to, from, gridScrollTop)`. It's unit-tested away from the router.

### The post page: `/posts/:id`

- **`usePostNavigation` is replaced by a composable** (e.g. `usePost(id)`, in `app/composables/`). It loads `GET /api/post/:id` with `useApi` (server-rendered, no refetch on hydration) and returns:
  - `post` (a ref the page can update after an edit);
  - `prevUrl` and `nextUrl` (`/posts/<prevId>` and `/posts/<nextId>`).
- **On a failure:** a 404 or 400 throws a fatal 404 error (`createError({ statusCode: 404, … })`), so `app/error.vue` shows "This page doesn't exist". That works on the server and on client navigation. Other failures show the error page with their own status.
  - This replaces the "Error: Invalid Post ID " alert and its 500 ms redirect.
- **Comments** (`usePostComments`) load as today. The post's 404 is thrown before comments are awaited.
- **Edit:**
  - updates the page's `post` from the response;
  - goes through `postStore.updatePost`, which also patches the shared list if the post is in it.
- **Delete:**
  - goes through `postStore.deletePostById`, which removes the post from the list if it's there;
  - then goes to `/posts`, as today.
- **The dead `<Transition>` around the post image is removed,** a deferred minor from #16. The fade between posts comes from the page transition.
- **Templates read `post` where they read `currentPost`.** The spinner placeholder goes, because the page throws before rendering without a post.

### Home page

`app/pages/index.vue` loads its own 7 with `useApi<PostPage>('/api/post', { query: { limit: 7 } })` and passes `data.posts` to the grid. If the load fails, the grid's existing empty state shows.

### `/admin/posts`

- **Rows** come from `postStore.posts`, loaded with `loadFirstPage()` in setup and extended by the same status component.
- **Deletes** go through `postStore.deletePostById`.
- **Its local `useApi('/api/post')` and `refresh()` go.**

### Behaviour changes, on purpose

- **An unknown or malformed post id** shows the 404 page instead of the "Error: Invalid Post ID " alert and redirect.
- **A failed first page on `/posts`** shows the inline error and **Try again**, as well as the alert. Before, it only alerted at startup.
- **The home page's recent posts** are fetched by the home page rather than taken from the startup list. They look the same.
- **Startup no longer loads posts,** so pages other than the grid, the admin posts page and the home page don't carry them.

## Tests

### API tests (`test/api/`)

**The paged list:**

- the first page is the 30 newest, with `nextCursor` set when more exist;
- following `nextCursor` returns the next 30 with no overlap;
- the last page has `nextCursor: null`;
- exactly 30 posts gives one page with `nextCursor: null`;
- `limit` works (7);
- posts with equal `date` page in `_id` order, with no repeats or gaps;
- **a post created between two page requests doesn't appear in the second page,** and the union of all pages has no duplicates;
- **deleting the cursor's post** between requests doesn't break the next page;
- a bad `limit` (0, 51, `abc`) or `cursor` answers 400 `VALIDATION_FAILED` with the messages above;
- an empty database gives `{ posts: [], nextCursor: null }`;
- the existing "lists posts without author emails" test is updated to the new shape.

**The single post:**

- the post comes back with the right neighbours from the middle of the list;
- the newest post's `prevId` is the oldest post, and the oldest post's `nextId` is the newest;
- a single post's neighbours are itself;
- an unknown id gets 404 `NOT_FOUND`;
- a malformed id gets 400.

### Unit tests (`test/unit/`)

**`postStore`:**

- `loadFirstPage` loads once;
- `loadMore` appends, ignores repeat calls while loading, stops at `done`, skips duplicate ids, and goes to `error` on failure and back on retry;
- create, update and delete patch the list.

**The status component:** each state's text, the live-region text, and that Try again calls the right action.

**The post composable:** the URLs come from the ids, and a 404 or 400 raises a fatal 404.

**The scroll decision:**

- a saved position wins;
- `/posts/:id` → `/posts` with `gridScrollTop` set returns it;
- `/posts/:id` → `/posts` with none goes to the top;
- `/about` → `/posts` goes to the top;
- a hash scrolls to its element.

The grid saves `scrollY` when it's left for a post, and not when it's left for another page.

**Page tests updated:** `postsPage`, `postPage`, the admin posts page (a delete removes the post from the store), the init plugin (no post loading), and the home page (asks for `limit=7`).

`usePostNavigation.test.ts` is replaced.

### Walkthrough (`pnpm dev`, local DB, about 70 seeded posts)

**Seeding** (my call): insert the posts straight into the local MongoDB with `mongosh`, giving them fake `imageId`s (`walk/…`).

- Their images show as broken, which is fine.
- No upload or delete ever reaches Cloudinary, because it isn't known which account `.env.local` points at.
- So the walkthrough doesn't delete posts through the UI. Admin deletes updating the list are covered by the unit test, and by the API tests' fake Cloudinary.

**Steps:**

- scroll to the end, with no repeats and the end text;
- scroll down and open post 35. Each of these comes back to the same place on the grid, with the same tiles:
  - the browser's Back button;
  - the close X;
  - the backdrop;
  - next twice, then the X;
- the header's "Posts" link from `/about` starts at the top;
- prev on the newest post goes to the oldest;
- `/posts/<unknown id>` loaded directly shows the 404 page with status 404;
- keyboard tabbing past the last tile loads more.

Clean up only the seeded records.

## Calls I made

The owner can overrule any of these.

- **Failures alert as well as showing the inline error.** That keeps "every API action goes through `run`" true. The cost is double feedback on a failed page load.
- **No compound `{ date, _id }` index,** to avoid an index change on production for 169 posts.
- **The status copy:** "Loading more photos…", "That's every photo of Manguito!", "No photos yet.", "Couldn't load more photos." and "Try again".
- **The limit is capped at 50,** and the cursor is opaque.
- **The loaded list isn't refreshed while the app stays open.**
- **`/admin/posts` shares the grid's store list.** It doesn't keep its own.
- **The walkthrough seeds posts with `mongosh` and fake image ids,** and doesn't delete posts through the UI, so nothing reaches Cloudinary.
- **Only the posts grid remembers its scroll position.** `/admin/posts` doesn't.

## Left to the builder

- The cursor's encoding.
- Names for the status component and the post composable.
- Whether `startStores` survives.
- How the store skips a reload after hydration.
- How the grid detects leaving for a post (e.g. `onBeforeRouteLeave`).
- Which hook the scroll behaviour waits on.
- An observer-missing fallback button.
- The exact test file split.
