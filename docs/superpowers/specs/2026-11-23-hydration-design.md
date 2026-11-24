# Hydration mismatches (#19) — design

## Why

A hydration mismatch means the page the server sent and the page the browser builds disagree: content flickers or is wrong, and the console fills with warnings. The app currently hides these with `data-allow-mismatch` and `<ClientOnly>`, and one is still visible on every post page. The goal is that every page hydrates cleanly with the suppressions gone, or kept only with a written reason.

## What the inventory found

The method: 14 pages, logged out / USER / ADMIN, at 1200 px and 390 px, with the browser in a different timezone from the server (84 loads). The pages were loaded once as they are and once with every suppression removed. Expired sessions and reloads part-way down a page were also tried.

| #   | Where                                                                                  | Cause                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Post page, every state (visible today)                                                 | The copy-link button is `v-if="isSupported"` from `useClipboard()`: false on the server, true in the browser.                                            |
| 2   | Post date, comment dates, `/admin/posts`, `/admin/comments` (hidden by `<ClientOnly>`) | `toDateString()` uses the server's timezone (UTC on Vercel) and then the visitor's; near midnight the day differs.                                       |
| 3   | `/posts` when page one fails during the server render (from reading the code)          | The payload has `status: 'error'`, `loaded: false`, so `loadFirstPage()` fetches again during hydration: different content, and possibly a second alert. |

Removing `data-allow-mismatch` from the header caused no warning in any state, width or scroll position; it dates from the old `app:created` store loading that #16 replaced. The footer year matched too, but it can differ for a few hours around New Year.

## Goals

- No hydration warnings on any page, in any of the states above.
- Dates are in the server-rendered HTML (no pop-in) and show the **visitor's own date** (owner's decision).
- The post page's `og:image` / `twitter:image` follow the post when moving with previous/next (carried over from #18).

## Non-goals

- A browser hydration check in CI (owner chose tests per cause plus a browser walk as PR evidence).
- `/posts` going back to the top on reload (that's #18's scroll rule, not hydration).
- `$apiFetch`'s type (`typeof $fetch`, so a direct call would be typed as the envelope). Nothing calls it directly, and every `useApi` call names its type, so changing it fixes nothing that exists today.
- #14's accessibility items.

## Anti-goals

- A date that is missing, wrong, or in a different format on some pages.
- The copy-link button disappearing or not copying.
- The grid not loading on a normal client-side visit to `/posts`, or "Try again" no longer working after a failed first page.
- A new `<ClientOnly>` or `data-allow-mismatch` added to hide a mismatch.

## Approaches

- **A. Fix each cause, a test per cause, and the 84-load browser walk before/after in the PR** (chosen). No new dependencies; CI time unchanged.
- **B. A plus Playwright in CI** through `@nuxt/test-utils`, failing on any hydration warning. Rejected: a new dependency and a browser download on every PR, to guard a class of bug this app has hit three times, and it would still only see what its seeded data triggers.

For the dates (owner's decision): **the visitor's own date** through Nuxt's `<NuxtTime>`, which rewrites the text to the browser's timezone just before hydration (`onPrehydrate`), so the server HTML has a date and hydration sees the same text. The alternative, one fixed timezone for everyone, was declined because visitors abroad could see a different day than their own.

## The design

1. **Dates:** a new `app/components/LocalDate.vue` (`<LocalDate :datetime="post.date" />`) wraps `<NuxtTime>` with `locale="en-US"`, `weekday="short"`, `month="short"`, `day="numeric"`, `year="numeric"` ("Fri, Nov 20, 2026"; the old text was "Fri Nov 20 2026"). It replaces the four `<ClientOnly>` dates (`ContentBlock`, `CommentItem`, `admin/posts`, `admin/comments`). The fixed `en-US` locale keeps the site's English format for every visitor; only the timezone is the visitor's (my call).
2. **Footer year:** `<NuxtTime year="numeric" locale="en-US" />` in place of the `<ClientOnly>` year in both layouts, so New Year can't mismatch either.
3. **Copy-link button:** `useClipboard({ legacy: true })`. `isSupported` is then true on both sides, and copying falls back to the old method where the Clipboard API is missing (plain http, old browsers).
4. **Failed first page:** `postStore.loadFirstPage()` does nothing while the app is hydrating (`useNuxtApp().isHydrating`, resolved in the store's setup). The server's result stands: a failed page shows the error line and "Try again", which then loads it. Client-side navigation is unchanged.
5. **Header:** remove `data-allow-mismatch` from both layouts.
6. **Head:** the post page's `og:image` and `twitter:image` are getters on `post`, so they follow previous/next.
7. **CLAUDE.md:** the browser-only bullet says to show dates with `<LocalDate>` (never `<ClientOnly>`), and that values which differ between server and browser (feature detection like `isSupported`, `Date`, timezone) must not decide what renders. The `postStore` text notes that `loadFirstPage` doesn't refetch during hydration.

## Tests (per cause)

- `LocalDate` renders `<time datetime="<ISO>">` with the `en-US` short format of that instant.
- The post page's server HTML (`test/pages/`) contains the copy-link button and a `<time datetime=…>` date for the post and for a comment.
- `/admin/posts` and `/admin/comments` server HTML contain the dates.
- `loadFirstPage` makes no request while hydrating, keeps `status: 'error'`, and `retry()` afterwards loads the page.
- The post page's head: after moving to another post, `og:image` names the new post's image.
- The browser walk: 84 loads with 0 hydration warnings, rerun with the suppressions gone.

## Left to the builder

- Where exactly each test lives, following the existing `test/pages/` and `test/unit/` patterns.
- How the head test observes the meta (`useHead` result in a mounted page or the server HTML of two different posts).
