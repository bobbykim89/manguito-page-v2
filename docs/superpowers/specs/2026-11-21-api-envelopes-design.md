# API response envelopes (issue #15, part 2a)

## Why

The owner asked for cleaner API responses: every response in one shape, `{ "ok": true, "data": … }` or `{ "ok": false, "error": { code, message, … } }`, with cleaner error messages.

Today:

- **Successes are inconsistent.** Most routes return the raw resource. Deletes return `{ status, text }`. Login and signup return `{ status, message, access_token }`.
- **Errors are H3's default error JSON.** The client digs out `statusMessage`.
- **401 is used both for "not logged in" and "not allowed".** So the client can't tell a dead session from a permission problem. A missing token gets 400, and an invalid id gets 500.

Nothing outside this website calls the API (confirmed by the owner). The server and client therefore switch in one PR, with no compatibility period.

Part 1 (#30) fixed the security holes. Part 2b, a separate PR, does the performance work: a per-request user loader, indexes, lean reads and length limits, plus the leftovers from the part 1 review.

## Goals

1. Every `/api` response, including errors thrown by middleware and unknown `/api` paths, is `{ ok: true, data }` or `{ ok: false, error: { code, message, details? } }`, with a matching HTTP status.
2. Error `code`s are a small fixed set. `message` is a sentence fit to show users, and it never contains server internals.
3. **401 means the caller isn't authenticated, and 403 means they are authenticated but not allowed.** A missing token is 401, and an invalid ObjectId is 400.
4. The client has one way to call the API, which unwraps `data` and throws a typed error. Stores and pages use it everywhere. The stores finally act on the difference between a dead session and a refusal.
5. The shapes are shared TypeScript types, so the server and client can't drift apart.

## Non-goals

- Performance, indexes, length limits and the DataLoader, which belong to part 2b.
- Pagination (#18).
- Changing who may do what. The authorization rules stay exactly as they are after #30.
- Changes to `app/error.vue` beyond what the new client errors require. Page errors are Nuxt's, not the API's.
- Versioning or keeping the old format.

## Approaches (decided with the owner)

- **A. A per-route wrapper (chosen).** Each route file becomes `export default defineApiRoute({ middleware: [...], handler })`. The wrapper runs the middleware and the handler, wraps the result as `{ ok: true, data }`, and turns anything thrown into the error envelope. It's visible in every route, typed, and catches middleware errors too.
- **B. A global Nitro hook** that wraps every `/api` response. There's less churn, but the wrapping is invisible. It also has to coexist with Nuxt's own error handler, which renders `error.vue` for pages. Not chosen.

## Design

### Shared types (`shared/types/api.types.ts`)

```ts
type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'UPSTREAM_FAILED'
  | 'INTERNAL'
type ApiSuccess<T> = { ok: true; data: T }
type ApiFailure = {
  ok: false
  error: { code: ApiErrorCode; message: string; details?: ApiErrorDetail[] }
}
type ApiErrorDetail = { path: string; message: string } // one per invalid field
type ApiResponse<T> = ApiSuccess<T> | ApiFailure
```

`API_ERROR_STATUS: Record<ApiErrorCode, number>` lives next to the types and maps each code to its HTTP status:

| Code                     | Status |
| ------------------------ | ------ |
| `VALIDATION_FAILED`      | 400    |
| `UNAUTHENTICATED`        | 401    |
| `INVALID_CREDENTIALS`    | 401    |
| `FORBIDDEN`              | 403    |
| `NOT_FOUND`              | 404    |
| `CONFLICT`               | 409    |
| `UNSUPPORTED_MEDIA_TYPE` | 415    |
| `UPSTREAM_FAILED`        | 502    |
| `INTERNAL`               | 500    |

### Server

- **`apiError(code, message, details?)`** (in `server/utils/`) returns an H3 error carrying the code, with the status taken from `API_ERROR_STATUS`. Controllers and middleware throw this instead of `createError({ status, message, statusMessage })`.
- **`defineApiRoute({ middleware?, handler })`** (in `server/utils/`) runs each middleware in order, then the handler. It returns `{ ok: true, data }` with status 200, or 201 when the route says so, via an optional `status` option. Anything thrown goes through `toApiFailure(err)`, which sets the status and returns the envelope. Routes no longer use `onRequest`.
- **`toApiFailure`** maps errors, in this order:
  - an `apiError` → its own code and message;
  - an H3 validation error from `readValidatedBody` (a Zod error inside) → `VALIDATION_FAILED`, message `Some fields are invalid.`, with `details` from the Zod issues;
  - a Mongoose `CastError` → `VALIDATION_FAILED`, `That id is not valid.`;
  - a MongoDB duplicate-key error (11000) → `CONFLICT`;
  - any other H3 error with a 4xx status → the matching code from its status (400 → `VALIDATION_FAILED`, 404 → `NOT_FOUND`, 413 and 415 → `UNSUPPORTED_MEDIA_TYPE`), with its `statusMessage` as the message. This covers H3's own errors, such as a missing multipart body.
  - anything else → `INTERNAL`, `Something went wrong, please try again.` The original error is logged with `console.error`.
- **Ids from the URL are checked up front.** A helper `parseObjectId(value)` in `server/utils/` throws `VALIDATION_FAILED`, "That id is not valid." Controllers call it on every route param and body id before querying (my call). `new Types.ObjectId(postId)` in `getCommentsByPostId` throws a BSON error, not a `CastError`, and a bad post id on comment create only fails at save. `toApiFailure` also maps BSON errors and Mongoose `ValidationError`s to `VALIDATION_FAILED` as a backstop.
- **Unknown paths:** a catch-all `server/api/[...].ts` returns `NOT_FOUND`, `No such API route.` for unknown paths and unsupported methods.
- **Middleware becomes plain functions:** `checkAuth`, `requireRole`, and the upload step (`uploadCloudinary` + `readFormDataText`).

**Status changes**, with messages kept close to today's wording:

| Situation                                                                                                                 | Today          | Now                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing token                                                                                                             | 400            | 401 `UNAUTHENTICATED`                                                                                                                                             |
| Bad or expired token                                                                                                      | 401            | 401 `UNAUTHENTICATED`                                                                                                                                             |
| User no longer exists                                                                                                     | 401            | 401 `UNAUTHENTICATED`, "Session expired, please log in again"                                                                                                     |
| Wrong email or password at login                                                                                          | 403            | 401 `INVALID_CREDENTIALS`                                                                                                                                         |
| Wrong current password when changing it                                                                                   | 403            | 401 `INVALID_CREDENTIALS`                                                                                                                                         |
| Role and ownership refusals (posts, comments, admin user routes, `requireRole`, wrong admin secret, admin already exists) | mixed 401/403  | 403 `FORBIDDEN`                                                                                                                                                   |
| Email or username already taken                                                                                           | 400            | 409 `CONFLICT`                                                                                                                                                    |
| Invalid ObjectId                                                                                                          | 500            | 400 `VALIDATION_FAILED`                                                                                                                                           |
| Cloudinary failure                                                                                                        | its own status | 502 `UPSTREAM_FAILED`                                                                                                                                             |
| 520 on comment save, the "Unexpected error" 500s                                                                          | 500/520        | 500 `INTERNAL`                                                                                                                                                    |
| Not found                                                                                                                 | 404            | 404 `NOT_FOUND`                                                                                                                                                   |
| Not png or jpeg                                                                                                           | 415            | 415 `UNSUPPORTED_MEDIA_TYPE`                                                                                                                                      |
| "Request body / file / content field not found"                                                                           | 404            | 400 `VALIDATION_FAILED` (a missing field is a bad request, not a missing resource)                                                                                |
| Reset password: user or token not found                                                                                   | 400            | 400 `VALIDATION_FAILED`, one message for both: "This reset link is invalid or has expired." (my call; it also stops the endpoint saying whether a user id exists) |
| Gmail send fails                                                                                                          | 500            | 502 `UPSTREAM_FAILED` (my call)                                                                                                                                   |

**Success payloads** stay as they are today, apart from these:

- **Login and signup:** `data: { accessToken: 'Bearer <jwt>' }`, with the field renamed from `access_token` and the echoed status and message dropped.
- **Deletes** (post, comment): `data: { id }`, the deleted id.
- **Send-token:** `data: { message: "If that email has an account, we've sent a reset link." }`, identical for known and unknown emails as before.
- **Reset-password:** `data: null`.
- **Admin role change, username change:** the updated user without the password, as today.
- **Password change:** `data: null`. Today it returns `{ status, message }`, which the client ignores (my call).
- **Any other route:** returns what it returns today.
- **Status codes:** create routes (POST post, POST comment, signup) answer 201. Everything else answers 200.

### Client

- **`app/plugins/api.plugin.ts`** provides `$api`, a `$fetch.create` instance that:
  - adds `Authorization` from `useAuthToken()` when a token exists;
  - unwraps `data` on success;
  - on failure, throws an `ApiError` (`app/utils/apiError.ts`: `class ApiError extends Error { status; code; details }`) built from the envelope. A failed request with no envelope, such as the network being down, becomes `ApiError(0, 'INTERNAL', 'Could not reach the server, please try again.')`.
- **`useApi(url, opts)`** wraps `useFetch` with `$fetch: $api` for page and store reads that need SSR. The data type is the unwrapped `T`.
- **All call sites move to `$api` / `useApi`:**
  - `userStore` (7), `postStore` (4);
  - `posts/[id].vue` (3);
  - `admin/posts.vue`, `admin/comments.vue`, `admin/users.vue` (2 each);
  - `auth/request.vue`, `auth/reset-password.vue` (1 each).

  Hand-written `Authorization` headers go away.

- **`useErrorCheck`:**
  - `extractMessage(err)` returns `err.message` for an `ApiError` and for any `Error`, and `'Unknown Error.'` otherwise.
  - `isAuthError(err)` is true only for `ApiError` with `code === 'UNAUTHENTICATED'`.
  - The `"no user authentication found"` message check goes. The stores' own "please login" errors become `ApiError(401, 'UNAUTHENTICATED', …)` thrown locally, or they skip the call and alert directly. Builder's choice, as long as the behaviour below holds.
- **Session handling:**
  - `userStore`'s `isUnauthorized` becomes `isAuthError`, so only `UNAUTHENTICATED` logs out. `INVALID_CREDENTIALS` (wrong login, wrong current password) and `FORBIDDEN` only alert.
  - **`postStore` now expires the session on `UNAUTHENTICATED`**, the same way `userStore` does for actions the user started: it clears auth, sets `sessionExpired` and alerts the message. That was blocked until 401 and 403 were split. `FORBIDDEN` only alerts.
  - **Page-level `$api` calls** (comments, admin pages, auth pages) alert `extractMessage(err)` on failure.
    - The comment add and delete in `posts/[id].vue`, and the admin actions in `admin/{posts,comments,users}.vue`, have no `try/catch` today, so this is new.
    - On failure they skip the success alert and the refresh.
  - **`useApi` errors aren't `ApiError` instances.** `useFetch` wraps them in a `NuxtError`, and the class doesn't survive the server-to-browser payload. Code that checks a `useApi` error reads `error.value.data.error.code` (the envelope), never `instanceof`.
- **`isAuthError` callers:** today `userStore` treats 401 as "session dead". With login failures moving to 401 `INVALID_CREDENTIALS`, the check must be by code, never by status.

### Docs

- **`CLAUDE.md` Conventions:**
  - the route example becomes `defineApiRoute`;
  - the Errors bullet describes `apiError`, the codes, the envelope and the client `$api` / `ApiError`;
  - the Auth and Client state bullets lose the "#15 splits 401/403" caveats.

## Testing

- **API tests** (`test/api/`): every existing test asserts through `res.json.data` or `res.json.error`. New tests:
  - one per row of the status table above;
  - an unknown `/api/nope` path → 404 envelope;
  - a validation failure with `details`;
  - an unexpected server error → generic `INTERNAL` message, no stack, no Mongo text. Triggering it needs a builder's choice, such as a route test that makes Mongo throw (stopping nothing shared), or a unit test of `toApiFailure` with a plain `Error`. The unit test is acceptable.
- **Unit tests:**
  - `toApiFailure` mapping, run under the `unit` project if it can import server code there; otherwise as API tests.
  - `$api` unwrapping and `ApiError` construction.
  - `useErrorCheck`.
  - `userStore` and `postStore` session handling for `UNAUTHENTICATED` vs `FORBIDDEN` vs `INVALID_CREDENTIALS`.
  - Existing unit tests' `mockApi` handlers return envelopes.
- **Page tests** (`test/pages/`) keep passing.
- **Manual checks in `pnpm dev` with the local DB:**
  - log in with a wrong password (alert, not logged out);
  - log in, then expire the session by deleting the user in the DB (the next action logs out);
  - as a USER, open an admin URL;
  - add and delete a comment.

## Left to the builder

- File names inside `server/utils/` and `app/utils/`.
- Exactly how `defineApiRoute` types middleware.
- How the stores' local "not logged in" checks are expressed (see above).
- Test file layout.
- Commit grouping. The server and client must land in the same PR, but a commit may leave the client temporarily broken only if each commit still passes the full test suite. Prefer commits that keep the suite green.
