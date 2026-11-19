# Stale session, error page, and first-load route guards — design

Issue: #22 (rescoped after reproduction)

## Why

Reproduced on master with the API test harness: a login cookie whose user no longer exists (e.g. after a DB reset or user deletion) makes **every page** show a red "User not found" alert. The original "404 page, then home" couldn't be reproduced; the likely explanation is that `app/error.vue` renders "404 – This page doesn't exist" for **every** error, so any error looks like a 404. While reproducing, a third problem turned up: `/admin/**` pages render (empty) for anonymous visitors, because route guards skip their check until `initStore.isMounted`, which only becomes true after startup. The server render never runs them.

## Goals

1. **A stale or invalid session logs the visitor out quietly** on every page: no alert, cookie and auth state cleared.
2. **The API answers 401, not 404,** when a valid token's user no longer exists.
3. **Route guards run on the first page load, including the server render.** An admin or user-only page with no valid session never renders.
4. **A stale session on a protected page goes to `/auth/login?reason=expired`,** and the login page says "Your session expired, please log in again."
5. **`error.vue` shows the real error:** 404 shows "This page doesn't exist"; anything else shows its status and a safe message.

## Non-goals

- Restructuring stores, a session store, or `useStoreAction` (that's #16).
- Response envelopes or error codes (#15).
- Changing what happens with **no** session at all on a protected page: it keeps today's behaviour (redirect to `/` with the "Admin only route" / "User only route" alert), now also on first load.
- The "Successfully authenticated user" alert on successful startup (unchanged).
- Password-reset lookups by email (`token.controller.ts`, "Not Found: User not found.") keep 404. That's an email lookup, not a session.

## Anti-goals

- A reader with an old cookie sees any message on a public page.
- A protected page flashes its content before redirecting.
- Guard logic duplicated in a Nitro server middleware (rejected approach 3).

## Approaches (picked: 1)

|                | Approach                                                                                                                                                                                                 | Trade-off                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **1 (picked)** | Fix in place: guards await the startup auth check; 401 for missing users; the user store treats 401 as a quiet logout; expired session → login with `?reason=expired`; `error.vue` reads the real error. | ~6–8 files. Tests pin the behaviour so #16 can restructure safely.                        |
| 2              | Port mango-planner-v2's `sessionStore` + `expire()` now.                                                                                                                                                 | Pulls most of #16 into a bug fix and touches every store.                                 |
| 3              | Nitro server guard for `/admin/**`.                                                                                                                                                                      | Nuxt guards are still needed for client navigation, so the same rule lives in two places. |

## Design

- **Startup is awaitable.** `initStore.initStores()` becomes idempotent per app instance (one shared promise). `init.plugin.ts` keeps calling it, and each guard (`adminRoute`, `authRoute`, `guestRoute`) awaits it before checking. The `isMounted` gate goes away from the guards. On the server, a guard's `navigateTo` produces a 302.
- **Server:** `auth.controller.getCurrentUser`, `user.controller.getCurrentUserData` and `getRawCurrentUserData` throw **401** with statusMessage "Session expired, please log in again" when the user doesn't exist.
- **Client:** `userStore` tracks `sessionExpired` (true when a cookie was present but `/api/auth` answered 401). On 401 it clears the cookie and auth state with **no alert**. Other errors keep today's alert behaviour.
- **Guards:** when not authenticated and `sessionExpired`, `adminRoute`/`authRoute` redirect to `/auth/login?reason=expired`. Otherwise the existing redirects and alerts stay.
- **Login page:** when `route.query.reason === 'expired'`, show "Your session expired, please log in again." in an element with `role="status"`.
- **`error.vue`:** takes the `error` prop (`NuxtError`). Title `<status> | Manguito Page`. A 404 keeps "This page doesn't exist". Other 4xx errors show `statusMessage`. 5xx errors show "Something went wrong, please try again" and never echo server internals.

## Tests (api project, plus unit where noted)

- `GET /api/auth` with a deleted user's token returns 401.
- SSR, deleted user's token: `/` returns 200, no "User not found" or "Session expired" text, and `Set-Cookie` clears `access_token`.
- SSR, deleted user's token: `/admin` returns 302 to `/auth/login?reason=expired`; `/admin/request` likewise.
- SSR, no token: `/admin` returns 302 to `/`.
- SSR, a valid `USER` token: `/admin` returns 302 to `/`. A valid `ADMIN` token: `/admin` returns 200.
- SSR, a valid token on `/auth/login` returns 302 to `/` (the guest guard now works on first load).
- SSR `/auth/login?reason=expired` contains "Your session expired".
- SSR, unknown route: 404 with "This page doesn't exist". `error.vue` with a 500 shows "Something went wrong" (unit, `mountSuspended`).

## Left to the builder

- How the shared startup promise is stored (store state vs module scope per `nuxtApp`).
- Test helpers for creating users and signing tokens (`test/utils/`).
- Updating the Conventions section of `CLAUDE.md` (startup and guards, 401 = quiet logout).
