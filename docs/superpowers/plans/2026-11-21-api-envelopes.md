# API Envelopes Implementation Plan (issue #15, part 2a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every `/api` response becomes `{ ok: true, data }` or `{ ok: false, error: { code, message, details? } }` with a matching status, and the client calls the API through one `$api` / `useApi` that unwraps `data` and throws a typed `ApiError`.

**Architecture:** Shared types and a code-to-status table in `shared/types/api.types.ts`. On the server, `defineApiRoute` wraps every route: it runs plain-function middleware and the handler, wraps the result, and turns anything thrown into the error envelope through `toApiFailure`. Controllers throw `apiError(code, message)`. On the client, a `$fetch.create` instance in a plugin adds the token and unwraps successes; `$api` converts failures to `ApiError`, and `useApi` wraps `useFetch` with the same instance.

**Tech Stack:** Nuxt 4.6 / Nitro / H3 1.15, ofetch 1.5, Mongoose 9, Zod 4, Pinia, Vitest (`api` and `unit` projects).

**Spec:** `docs/superpowers/specs/2026-11-21-api-envelopes-design.md`

## Global Constraints

- Codes and statuses, exactly: `VALIDATION_FAILED` 400, `UNAUTHENTICATED` 401, `INVALID_CREDENTIALS` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `UNSUPPORTED_MEDIA_TYPE` 415, `UPSTREAM_FAILED` 502, `INTERNAL` 500.
- Fixed copy:
  - validation: `Some fields are invalid.`
  - bad id: `That id is not valid.`
  - unknown path: `No such API route.`
  - unexpected error: `Something went wrong, please try again.`
  - reset link: `This reset link is invalid or has expired.`
  - send-token: `If that email has an account, we've sent a reset link.`
  - user gone: `Session expired, please log in again`
  - no envelope (client): `Could not reach the server, please try again.`
- Error `message` never contains a stack, a Mongo message or other server internals.
- Authorization rules don't change (who may do what stays as after #30). Only statuses, codes and messages change.
- Only `UNAUTHENTICATED` logs a user out on the client, and the check is by code, never by status.
- No network in tests: mail and Cloudinary go to `test/setup/fakes.ts`.
- Never run with `SKIP_BUILD=1` after a server change unless a build has run since.
- Commits: Conventional Commits with a path scope, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Run `pnpm lint` and `pnpm format` before each commit.
- Every commit leaves `pnpm test` green.
- In commands, `…/` stands for the plan workspace `.superpowers/sdd/2026-11-21-api-envelopes/`. Long test output goes there.

## Review Focus

1. **Malformed JSON body** (`content-type: application/json`, body `{bad`): expect a 400 `VALIDATION_FAILED` envelope, not H3's default JSON. Test in Task 3.
2. **A server-rendered page whose `useApi` read fails** (`/posts/not-an-id`, where the comments GET now answers 400): the page still renders, with no 500. Test in Task 6.
3. **A failure response with no envelope** (a proxy's HTML 504): expect an `ApiError` with code `INTERNAL` and the generic message, and no crash reading `.error.code`. Test in Task 2.
4. **A logged-in user refused with `FORBIDDEN`** on a post action: they stay logged in and see the message. Test in Task 8.
5. **A wrong HTTP method on a real route** (`PATCH /api/post`): expect a 404 envelope, not Nuxt's HTML error page. Test in Task 3.

---

### Task 1: Shared types and server error mapping

**Files:**

- Create: `shared/types/api.types.ts`
- Modify: `shared/types/index.ts` (re-export)
- Create: `server/utils/apiError.util.ts`
- Modify: `server/utils/index.ts` (re-export)
- Test: `test/unit/apiFailure.test.ts`

**Interfaces:**

- Produces:
  - **Types** (all from `#shared/types`): `ApiErrorCode`, `ApiErrorDetail = { path: string; message: string }`, `ApiSuccess<T>`, `ApiFailure`, `ApiResponse<T>`, `API_ERROR_STATUS: Record<ApiErrorCode, number>`. The type shapes are given in the spec.
  - `apiError(code: ApiErrorCode, message: string, details?: ApiErrorDetail[]): H3Error`. It is an H3 error with `statusCode = API_ERROR_STATUS[code]` and `data = { code, message, details }`, so it still has the right status even outside the wrapper.
  - `toApiFailure(err: unknown): { status: number; body: ApiFailure }`.

- [ ] **Step 1: Write the failing test.** Create `test/unit/apiFailure.test.ts`. It imports from `../../server/utils/apiError.util`, the way `mongoUrl.test.ts` imports server code. The file must not import mongoose, so the checks below go by `name` and `code`.

```ts
const failure = (err: unknown) => toApiFailure(err)

it('keeps an apiError as is', () => {
  expect(failure(apiError('FORBIDDEN', 'Access denied.'))).toEqual({
    status: 403,
    body: {
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Access denied.' },
    },
  })
})
it('turns a Zod validation error into details', () => {
  const zod = z
    .object({ email: z.email({ message: 'Invalid email address' }) })
    .safeParse({ email: 'x' }).error
  const err = createError({
    statusCode: 400,
    statusMessage: 'Validation Error',
    data: zod,
  })
  expect(failure(err)).toEqual({
    status: 400,
    body: {
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Some fields are invalid.',
        details: [{ path: 'email', message: 'Invalid email address' }],
      },
    },
  })
})
it.each(['CastError', 'BSONError', 'ValidationError'])(
  'maps a %s to a bad id',
  (name) => {
    expect(
      failure(
        Object.assign(new Error('Cast to ObjectId failed for "x"'), { name }),
      ).body.error,
    ).toEqual({ code: 'VALIDATION_FAILED', message: 'That id is not valid.' })
  },
)
it('maps a duplicate key to CONFLICT', () => {
  const r = failure(
    Object.assign(new Error('E11000 duplicate key users.email'), {
      code: 11000,
    }),
  )
  expect(r.status).toBe(409)
  expect(r.body.error.code).toBe('CONFLICT')
  expect(r.body.error.message).not.toContain('E11000')
})
it.each([
  [400, 'VALIDATION_FAILED'],
  [401, 'UNAUTHENTICATED'],
  [403, 'FORBIDDEN'],
  [404, 'NOT_FOUND'],
  [409, 'CONFLICT'],
  [413, 'UNSUPPORTED_MEDIA_TYPE'],
  [415, 'UNSUPPORTED_MEDIA_TYPE'],
  [422, 'VALIDATION_FAILED'],
])('maps an H3 %i to %s with its statusMessage', (statusCode, code) => {
  const r = failure(createError({ statusCode, statusMessage: 'Nope' }))
  expect(r.body.error).toEqual({ code, message: 'Nope' })
  expect(r.status).toBe(API_ERROR_STATUS[code as ApiErrorCode])
})
it('hides anything else behind INTERNAL and logs it', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  const r = failure(new Error('MongoServerError: secret at /srv/app.js:1'))
  expect(r).toEqual({
    status: 500,
    body: {
      ok: false,
      error: {
        code: 'INTERNAL',
        message: 'Something went wrong, please try again.',
      },
    },
  })
  expect(log).toHaveBeenCalled()
})
it('hides an H3 5xx too', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(
    failure(
      createError({ statusCode: 500, statusMessage: 'Failed: ECONNREFUSED' }),
    ).body.error.message,
  ).toBe('Something went wrong, please try again.')
})
```

Also add one test that `details` is left out (not `undefined`) when `apiError` is given none: `expect('details' in body.error).toBe(false)`.

- [ ] **Step 2: Run the test and watch it fail.**
  - Run: `pnpm vitest run --project unit test/unit/apiFailure.test.ts`
  - Expected: FAIL, because the module `apiError.util` can't be resolved.

- [ ] **Step 3: Implement the types, `apiError` and `toApiFailure`.**
  - **Order of checks in `toApiFailure`:**
    1. the `apiError` marker (`data.code` is one of `API_ERROR_STATUS`'s keys);
    2. an H3 error whose `data.issues` is an array (Zod) → details from `issue.path.join('.')` and `issue.message`;
    3. `name` is `CastError`, `BSONError` or `ValidationError`;
    4. `code === 11000` → `CONFLICT`, `That value is already in use.`;
    5. an H3 error with a 4xx status → mapped by status, with `statusMessage || message`;
    6. anything else → `INTERNAL`, generic message, `console.error(err)`.
  - The status is always `API_ERROR_STATUS[code]`.

- [ ] **Step 4: Run the test again and watch it pass.**
  - Run: `pnpm vitest run --project unit test/unit/apiFailure.test.ts`
  - Expected: PASS.

- [ ] **Step 5: Commit.** Use the message `feat(server/utils/): map every API error to one envelope shape`.

---

### Task 2: Client API core

**Files:**

- Create: `app/utils/apiError.ts`
- Create: `app/plugins/api.plugin.ts`
- Create: `app/composables/useApi.ts`
- Modify: `app/composables/useErrorCheck.ts`
- Modify: `test/unit/helpers.ts`
- Test: `test/unit/apiClient.test.ts`, `test/unit/errorCheck.test.ts`

**Interfaces:**

- Consumes: the `#shared/types` API types from Task 1.
- Produces:
  - `class ApiError extends Error { status: number; code: ApiErrorCode; details?: ApiErrorDetail[] }`, built as `new ApiError(status, code, message, details?)`.
  - `toApiError(err: unknown): ApiError`.
  - From the plugin:
    - `useNuxtApp().$apiFetch` is a `$fetch.create` instance. It sets `Authorization` from `useAuthToken()` (the ref is captured at plugin setup) when a token exists, and its `onResponse` replaces `response._data` with `.data` when `_data?.ok === true`.
    - `useNuxtApp().$api` is `<T>(url: string, opts?: NitroFetchOptions<string>) => Promise<T>`. It calls `$apiFetch` and rethrows failures through `toApiError`.
  - `useApi<T>(url: string | (() => string), opts?: UseFetchOptions<T>)` is `useFetch` with `$fetch: useNuxtApp().$apiFetch`, and its `data` is `T`. Its errors are `NuxtError`s whose `.data` is the envelope.
  - `useErrorCheck()`:
    - `extractMessage(err)` returns `err.message` for `ApiError`, `err.data.error.message` for a `useApi` error, `err.message` for any other `Error`, and `'Unknown Error.'` otherwise;
    - `isAuthError(err)` is true only when the code is `UNAUTHENTICATED`, from `ApiError.code` or `err.data.error.code`.
  - Test helpers in `test/unit/helpers.ts`:
    - `okEnvelope<T>(data: T): ApiSuccess<T>`;
    - `failEnvelope(event: H3Event, code: ApiErrorCode, message: string, details?): ApiFailure`, which sets the response status from `API_ERROR_STATUS`.

- [ ] **Step 1: Write the failing tests.**
  - **`apiClient.test.ts`:** use `resetState()` and `clearApiMocks()` as the other unit tests do.

```ts
it('unwraps data', async () => {
  mockApi('GET', '/api/thing', () => okEnvelope({ n: 1 }))
  expect(await useNuxtApp().$api('/api/thing')).toEqual({ n: 1 })
})
it('sends the session token', async () => {
  useAuthToken().value = 'Bearer abc'
  let auth: string | undefined
  mockApi('GET', '/api/thing', (e) => {
    auth = getRequestHeader(e, 'authorization')
    return okEnvelope(null)
  })
  await useNuxtApp().$api('/api/thing')
  expect(auth).toBe('Bearer abc')
})
it('throws an ApiError from the envelope', async () => {
  mockApi('GET', '/api/thing', (e) =>
    failEnvelope(e, 'FORBIDDEN', 'Access denied.'),
  )
  const err = await useNuxtApp()
    .$api('/api/thing')
    .catch((e) => e)
  expect(err).toBeInstanceOf(ApiError)
  expect([err.status, err.code, err.message]).toEqual([
    403,
    'FORBIDDEN',
    'Access denied.',
  ])
})
it('treats a response without an envelope as unreachable', () => {
  const html = Object.assign(new Error('504'), {
    status: 504,
    data: '<html>Gateway</html>',
  })
  expect(toApiError(html)).toMatchObject({
    code: 'INTERNAL',
    message: 'Could not reach the server, please try again.',
  })
  expect(toApiError(new TypeError('fetch failed'))).toMatchObject({
    status: 0,
    code: 'INTERNAL',
  })
})
it('useApi gives the unwrapped data', async () => {
  mockApi('GET', '/api/list', () => okEnvelope([1, 2]))
  const { data } = await useApi<number[]>('/api/list')
  expect(data.value).toEqual([1, 2])
})
```

- **`errorCheck.test.ts`:**
  - `isAuthError` is true for `new ApiError(401, 'UNAUTHENTICATED', 'x')` and for `{ data: { ok: false, error: { code: 'UNAUTHENTICATED', message: 'x' } } }`.
  - `isAuthError` is false for `new ApiError(401, 'INVALID_CREDENTIALS', 'x')`, for `new ApiError(403, 'FORBIDDEN', 'x')` and for `{ statusCode: 401 }`.
  - `extractMessage` returns `'x'` for both envelope shapes and `'Unknown Error.'` for `42`.

- [ ] **Step 2: Run the tests and watch them fail.**
  - Run: `pnpm vitest run --project unit test/unit/apiClient.test.ts test/unit/errorCheck.test.ts`
  - Expected: FAIL, because `okEnvelope`, `ApiError` and `$api` aren't defined.

- [ ] **Step 3: Implement the four client files and the two helpers.**
  - `toApiError`: an `ApiError` passes through; an error whose `.data` is an `ApiFailure` becomes `ApiError(status, code, message, details)`; anything else becomes `ApiError(0, 'INTERNAL', 'Could not reach the server, please try again.')`.

- [ ] **Step 4: Run the tests again and watch them pass.**
  - Run: `pnpm vitest run --project unit`
  - Expected: PASS. Nothing calls the new code yet, so every other unit test still passes.

- [ ] **Step 5: Commit.** Use the message `feat(app/plugins/): add $api, useApi and ApiError`.

---

### Task 3: The switch to envelopes

Server and client move together here, because a server sending envelopes breaks the old client's `useFetch` reads (for example, `posts.value.slice` crashes the SSR of `/posts`). Every route keeps its current controller, so error codes come from `toApiFailure`'s status mapping until Tasks 5 to 7.

**Files:**

- Create:
  - `server/utils/defineApiRoute.util.ts`, re-exported from `server/utils/index.ts`;
  - `server/api/[...].ts`.
- Modify:
  - all 19 route files under `server/api/`;
  - `app/stores/userStore.ts`, `app/stores/postStore.ts`;
  - `app/pages/posts/[id].vue`;
  - `app/pages/admin/{posts,comments,users}.vue`;
  - `app/pages/auth/{request,reset-password}.vue`.
- Test:
  - every `test/api/*.test.ts`;
  - `test/utils/api.ts`;
  - `test/unit/{userStore,adminUsersPage,postsPage,requestPage}.test.ts`;
  - new `test/api/envelope.test.ts`.

**Interfaces:**

- Consumes: `toApiFailure` and `apiError` (Task 1); `$api`, `useApi`, `useErrorCheck`, `okEnvelope` and `failEnvelope` (Task 2).
- Produces:
  - `type ApiMiddleware = (e: H3Event) => void | Promise<void>`.
  - `defineApiRoute<T>({ middleware?: ApiMiddleware[]; handler: (e: H3Event) => T | Promise<T>; status?: 200 | 201 })` returns an event handler that answers `ApiResponse<Awaited<T>>`. On success it calls `setResponseStatus(e, status ?? 200)`. On failure it calls `setResponseStatus(e, failure.status)` and returns `failure.body`.
  - In `test/utils/api.ts`, `expectApiError(res: ApiResult, code: ApiErrorCode, message?: string)` checks that the status is `API_ERROR_STATUS[code]`, that `res.json.ok` is `false`, the code, and, when given, the message.

- [ ] **Step 1: Write the failing test.** Create `test/api/envelope.test.ts`:

```ts
it('wraps a success', async () => {
  await clearContent()
  const res = await api('GET', '/api/post')
  expect(res.status).toBe(200)
  expect(res.json).toEqual({ ok: true, data: [] })
})
it('answers an unknown path with a 404 envelope', async () => {
  expectApiError(
    await api('GET', '/api/nope'),
    'NOT_FOUND',
    'No such API route.',
  )
})
it('answers a wrong method on a real route with a 404 envelope', async () => {
  expectApiError(
    await api('PATCH', '/api/post'),
    'NOT_FOUND',
    'No such API route.',
  )
})
it('lists the invalid fields', async () => {
  const res = await api('POST', '/api/auth', {
    body: { email: 'nope', password: 'x' },
  })
  expectApiError(res, 'VALIDATION_FAILED', 'Some fields are invalid.')
  expect(
    res.json.error.details.map((d: { path: string }) => d.path).sort(),
  ).toEqual(['email', 'password'])
})
it('answers a malformed JSON body with a 400 envelope', async () => {
  const res = await api('POST', '/api/auth', {
    raw: '{bad',
    headers: { 'content-type': 'application/json' },
  })
  expectApiError(res, 'VALIDATION_FAILED')
})
it('wraps errors thrown by middleware', async () => {
  expectApiError(
    await api('GET', '/api/auth', { token: 'Bearer not-a-jwt' }),
    'UNAUTHENTICATED',
  )
})
it('never sends the password hash', async () => {
  const { token } = await insertUser()
  const res = await api('GET', '/api/auth', { token })
  expect(res.json.ok).toBe(true)
  expect(res.json.data).not.toHaveProperty('password')
})
```

Then update the existing API tests to read the envelope: `res.json.X` becomes `res.json.data.X`, and `toEqual([])` becomes `res.json.data`. Status assertions stay as they are in this task: the controllers haven't changed, so 401s are still 401. `smoke.test.ts`'s unknown path gets a 404 status plus `res.json.ok === false`.

- [ ] **Step 2: Run the tests and watch them fail.**
  - Run: `pnpm vitest run --project api test/api/envelope.test.ts`
  - Expected: FAIL. `res.json` is the raw array, and the unknown path answers H3's default 404 JSON.

- [ ] **Step 3: Implement `defineApiRoute` and the catch-all, then convert every route.**
  - The catch-all `server/api/[...].ts` is a `defineApiRoute` whose handler throws `apiError('NOT_FOUND', 'No such API route.')`.
  - Each route becomes `export default defineApiRoute({ middleware: [checkAuth, ...], handler: xController.method })`.
  - `POST /api/post` uses `middleware: [checkAuth, requireRole('ADMIN', 'MANAGER'), uploadPostImage]`, where `uploadPostImage` is a function in that route file that runs `uploadCloudinary` and then `readFormDataText` (Task 6 reverses the order).
  - Keep the comment on why the role check comes before the upload.
  - No `defineEventHandler` / `onRequest` remains under `server/api/`.

- [ ] **Step 4: Move every client call site to `$api` / `useApi`.**
  - **Hand-written `Authorization` headers go.** Take `const { $api } = useNuxtApp()` once at the top of each store setup and page `<script setup>`, never inside an async action.
  - **userStore:**
    - Replace `isUnauthorized(err)` with `errorCheck.isAuthError(err)`.
    - Login and signup read `res.access_token` from the unwrapped data. Task 4 renames that field.
  - **postStore `getAllPosts`:** use `useApi<PostType[]>('/api/post')`. On `error.value`, call `handlePostError(error.value)`; otherwise set `posts.value = data.value ?? []`.
  - **Pages:**
    - The four `useFetch` reads become `useApi`.
    - In `request.vue` and `reset-password.vue`, the `catch` alerts `useErrorCheck().extractMessage(error)`, and the `H3Error` imports go.
  - **Unit mocks** return `okEnvelope(...)`. The `createError` throws in `userStore.test.ts` become `failEnvelope(e, 'UNAUTHENTICATED', 'Session expired, please log in again')` and `failEnvelope(e, 'INTERNAL', 'boom')`. That test then expects the alert `boom`, since an `INTERNAL` envelope's message is shown as sent.

- [ ] **Step 5: Run the full suite.**
  - Run: `pnpm test > .superpowers/sdd/2026-11-21-api-envelopes/task3.log 2>&1; tail -30 .superpowers/sdd/2026-11-21-api-envelopes/task3.log`
  - Expected: all pass, including `test/pages/guards.test.ts`. The stale-token 401 is still mapped to `UNAUTHENTICATED`, so it still logs out quietly.
  - Also run `pnpm typecheck` and `pnpm lint`. Expected: clean.

- [ ] **Step 6: Exercise the change in `pnpm dev` (local DB).** Load `/`, `/posts` and one post page, log in, and open `/admin/users` as an admin. Expected: everything loads with no console errors, and the network tab shows envelopes.

- [ ] **Step 7: Commit.** Use the message `feat(server/api/): answer every route with an ok/data or ok/error envelope`. The body notes that the client moves to `$api` in the same commit.

---

### Task 4: Success payloads

**Files:**

- Modify:
  - `server/controller/auth/auth.controller.ts` (`loginUser`);
  - `server/controller/user/user.controller.ts` (`signupUser`, `updatePassword`);
  - `server/controller/post/post.controller.ts` (`deletePostById`);
  - `server/controller/comment/comment.controller.ts` (`deleteCommentById`);
  - `server/controller/token/token.controller.ts`;
  - the routes `server/api/post/index.post.ts`, `server/api/comment/[id]/index.post.ts` and `server/api/user/index.post.ts` (`status: 201`);
  - `app/stores/userStore.ts` (`accessToken`).
- Test:
  - `test/api/payloads.test.ts` (new);
  - `test/utils/auth.ts` (new helper);
  - `test/api/token.test.ts`, `test/api/postCreate.test.ts`.

**Interfaces:**

- Produces: `signup(): Promise<{ email: string; name: string; password: string; token: string }>` in `test/utils/auth.ts`. It posts a unique user to `/api/user`, sets `token` to `data.accessToken`, and uses the password `Passw0rd!`.

- [ ] **Step 1: Write the failing tests.** Create `test/api/payloads.test.ts`:

```ts
it('signup answers 201 with only an access token', async () => {
  const res = await api('POST', '/api/user', {
    body: {
      name: `n-${Date.now()}`,
      email: `s-${Date.now()}@example.test`,
      password: 'Passw0rd!',
    },
  })
  expect(res.status).toBe(201)
  expect(Object.keys(res.json.data)).toEqual(['accessToken'])
  expect(res.json.data.accessToken).toMatch(/^Bearer /)
})
it('login answers only an access token', async () => {
  const u = await signup()
  const res = await api('POST', '/api/auth', {
    body: { email: u.email, password: u.password },
  })
  expect(res.status).toBe(200)
  expect(Object.keys(res.json.data)).toEqual(['accessToken'])
})
it('a password change answers null', async () => {
  const u = await signup()
  const res = await api('PUT', '/api/user/user-info/password', {
    token: u.token,
    body: { currentPassword: u.password, newPassword: 'N3wPassw0rd!' },
  })
  expect(res.json).toEqual({ ok: true, data: null })
})
it('deleting a post answers its id', async () => {
  /* MANAGER deletes own seeded post */
  expect(res.json).toEqual({ ok: true, data: { id: postId } })
})
it('deleting a comment answers its id', async () => {
  /* author deletes own seeded comment */
  expect(res.json).toEqual({ ok: true, data: { id: commentId } })
})
it('creating a comment answers 201 with the comment', async () => {
  const res = await api('POST', `/api/comment/${postId}`, {
    token: user.token,
    body: { text: 'hi' },
  })
  expect(res.status).toBe(201)
  expect(res.json.data.text).toBe('hi')
})
```

Also make these changes to existing tests:

- In `postCreate.test.ts`, a manager's create expects `201`.
- In `token.test.ts`:
  - the generic-answer test expects `res.json` to equal `{ ok: true, data: { message: GENERIC } }` for both the known and the unknown email;
  - a successful reset expects `res.json` to equal `{ ok: true, data: null }`.

- [ ] **Step 2: Run the tests and watch them fail.**
  - Run: `pnpm test > …/task4.log 2>&1; tail -40 …/task4.log`
  - Expected: FAIL. The payloads still carry `status`, `message` and `access_token`, and creates answer 200.

- [ ] **Step 3: Change the payloads and statuses** as the spec's "Success payloads" section lists.
  - Remove the now-unused `setResponseStatus`, `getResponseStatus` and `getResponseStatusText` imports.
  - `RESET_REQUESTED` becomes the `{ message }` object.

- [ ] **Step 4: Update the client.** In `userStore`, login and signup read `accessToken`, and the `AuthToken` interface becomes `{ accessToken: string }`.

- [ ] **Step 5: Run the full suite, typecheck and lint.**
  - Run: `pnpm test`, `pnpm typecheck`, `pnpm lint`
  - Expected: all clean.
  - Then log in and sign up in `pnpm dev`. Expected: both work.

- [ ] **Step 6: Commit.** Use the message `feat(server/controller/): return lean success payloads and 201 on create`.

---

### Task 5: Authentication and permission errors

**Files:**

- Modify:
  - `server/utils/checkAuth.util.ts`, `server/utils/requireRole.util.ts`;
  - `server/controller/{auth,user,post,comment}/*.controller.ts`.
- Test:
  - `test/api/authErrors.test.ts` (new);
  - `test/api/{ownership,postCreate,auth}.test.ts`.

**Interfaces:**

- Consumes: `apiError` (Task 1) and `signup()` (Task 4).

- [ ] **Step 1: Write the failing tests.** Create `test/api/authErrors.test.ts`, with one test per status-table row:

| Request                                                              | Expect                                                                            |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `GET /api/auth`, no token                                            | `UNAUTHENTICATED`, `No access token found, please log in.`                        |
| `GET /api/auth`, `Bearer not-a-jwt`                                  | `UNAUTHENTICATED`, `Access token is not valid, please log in again.`              |
| `GET /api/auth`, token of a deleted user                             | `UNAUTHENTICATED`, `Session expired, please log in again`                         |
| `POST /api/auth`, unknown email                                      | `INVALID_CREDENTIALS`, `Invalid credential: please check email or password again` |
| `POST /api/auth`, right email, wrong password (from `signup()`)      | `INVALID_CREDENTIALS`, same message                                               |
| `PUT /api/user/user-info/password`, wrong `currentPassword`          | `INVALID_CREDENTIALS`, `Invalid credential: please check your password again`     |
| `GET /api/user/admin` as USER                                        | `FORBIDDEN`                                                                       |
| `PUT /api/user/admin/:id` as MANAGER                                 | `FORBIDDEN`                                                                       |
| `PUT /api/user/admin` with phrase `wrong`                            | `FORBIDDEN`, `Access denied.`                                                     |
| `PUT /api/user/admin` with `test-admin-phrase` while an ADMIN exists | `FORBIDDEN`, `Access denied: admin already exists.`                               |

In the existing tests, the refusals in `ownership.test.ts` and the USER create in `postCreate.test.ts` change from `401` to `expectApiError(res, 'FORBIDDEN')`. Their "nothing changed" assertions stay. `auth.test.ts`'s deleted-user test uses `expectApiError`.

- [ ] **Step 2: Run the tests and watch them fail.**
  - Run: `pnpm test > …/task5.log 2>&1; tail -40 …/task5.log`
  - Expected: FAIL. The no-token case is 400 `VALIDATION_FAILED`, login is 403 `FORBIDDEN`, and the refusals are 401.

- [ ] **Step 3: Replace every auth and permission `createError` with `apiError`.**
  - **Codes:**
    - `checkAuth`, user-gone and expired-session checks → `UNAUTHENTICATED`;
    - wrong login and wrong current password → `INVALID_CREDENTIALS`;
    - role and ownership refusals → `FORBIDDEN`.
  - **Messages:**
    - the two `checkAuth` messages are the ones in the table above;
    - every other message stays as today, without a status-word prefix.
  - **`getRawCurrentUserData`, `getCurrentUserData` and `getCurrentUser`** also throw `UNAUTHENTICATED`, `Session expired, please log in again`.

- [ ] **Step 4: Run the full suite.**
  - Run: `pnpm test`
  - Expected: PASS, guards included.

- [ ] **Step 5: Commit.** Use the message `fix(server/): answer 401 only for missing sessions and 403 for refusals`.

---

### Task 6: Input errors

**Files:**

- Create: `server/utils/objectId.util.ts`, re-exported from `server/utils/index.ts`.
- Modify:
  - every controller;
  - `server/utils/cloudinary.util.ts`, `server/utils/readContent.util.ts`;
  - `server/api/post/index.post.ts` (order).
- Test:
  - `test/api/inputErrors.test.ts` (new);
  - `test/api/token.test.ts`, `test/api/userRole.test.ts`;
  - `test/pages/ssr.test.ts`.

**Interfaces:**

- Produces: `parseObjectId(value: string | undefined): Types.ObjectId`. It throws `apiError('VALIDATION_FAILED', 'That id is not valid.')` for a missing value or an invalid one (`Types.ObjectId.isValid` plus a 24-hex check).

- [ ] **Step 1: Write the failing tests.** Create `test/api/inputErrors.test.ts`:

| Request                                                      | Expect                                                            |
| ------------------------------------------------------------ | ----------------------------------------------------------------- |
| `GET /api/comment/not-an-id`                                 | `VALIDATION_FAILED`, `That id is not valid.`                      |
| `POST /api/comment/not-an-id` as USER, `{ text: 'hi' }`      | same, and no comment stored                                       |
| `DELETE /api/post/not-an-id` as ADMIN                        | same                                                              |
| `PUT /api/post/not-an-id` as MANAGER                         | same                                                              |
| `DELETE /api/comment/not-an-id` as ADMIN                     | same                                                              |
| `PUT /api/user/admin/not-an-id` as ADMIN, `{ role: 'USER' }` | same                                                              |
| `POST /api/token/reset-password`, `userId: 'not-an-id'`      | `VALIDATION_FAILED`, `This reset link is invalid or has expired.` |
| `DELETE /api/post/<new ObjectId>` as ADMIN                   | `NOT_FOUND`                                                       |
| `PUT /api/user/admin/<new ObjectId>` as ADMIN                | `NOT_FOUND`                                                       |
| `POST /api/user` with a taken email                          | `CONFLICT`                                                        |
| `POST /api/user` with a taken name                           | `CONFLICT`                                                        |
| `PUT /api/user/user-info/username` to a taken name           | `CONFLICT`                                                        |
| `POST /api/post` as MANAGER, form without `image`            | `VALIDATION_FAILED`, `File not found`, and no upload              |
| `POST /api/post` as MANAGER, form without `content`          | `VALIDATION_FAILED`, `Content field not found`, and **no upload** |
| `POST /api/post` as MANAGER, `image` as `text/plain`         | `UNSUPPORTED_MEDIA_TYPE`, and no upload                           |
| `POST /api/post` as MANAGER, JSON body                       | `VALIDATION_FAILED`                                               |

Also update and add these tests:

- **`token.test.ts`:** the existing 400 checks (old link, reused token, stored digest used as the token) use `expectApiError(res, 'VALIDATION_FAILED', 'This reset link is invalid or has expired.')`. Add one test for an unknown but valid `userId` that gets the same answer.
- **`userRole.test.ts`:** the bad role uses `expectApiError(res, 'VALIDATION_FAILED')`.
- **`ssr.test.ts`:** add `it('renders a post page with a bad id without a server error')`, where `(await page('/posts/not-an-id')).status` is below 500.

- [ ] **Step 2: Run the tests and watch them fail.**
  - Run: `pnpm test > …/task6.log 2>&1; tail -40 …/task6.log`
  - Expected: FAIL.
    - Invalid ids give 500 `INTERNAL`, or for the comment GET, a BSON error.
    - Taken values give 400.
    - A missing field gives 404.
    - A missing `content` still uploads.

- [ ] **Step 3: Implement the changes.**
  - **Ids:** call `parseObjectId` on every route param and body id before querying.
  - **Taken values** throw `CONFLICT`:
    - email: `That email address is already in use, please use a different one.`;
    - name: `` `Username '${username}' is already in use, please use a different one.` ``.
  - **Missing body, file or field** gives `VALIDATION_FAILED` with today's messages. The 415 becomes `UNSUPPORTED_MEDIA_TYPE` with today's message.
  - **`setUserRole`** throws `NOT_FOUND`, `User not found` when the update returns null.
  - **Reset password:** both not-found cases, and an invalid `userId`, give the single reset-link message. Catch the `parseObjectId` failure there and rethrow with that message.
  - **The "Unexpected error" 500s and the 520** become `apiError('INTERNAL', 'Something went wrong, please try again.')`. Remove the try/catch blocks in `deletePostById` that only re-throw a 500, since the wrapper already does that.
  - **Upload order:** `uploadPostImage` now runs `readFormDataText` before `uploadCloudinary`.
  - **Cleanup:**
    - delete the unused `PostController.getPostById`;
    - the `if (!x)` branches after `find()` (which never returns null) may go.

- [ ] **Step 4: Run the full suite.**
  - Run: `pnpm test`
  - Expected: PASS.

- [ ] **Step 5: Commit.** Use the message `fix(server/controller/): reject bad ids, taken names and missing fields with 4xx`.

---

### Task 7: Upstream failures

**Files:**

- Modify:
  - `test/setup/fakes.ts`, `test/utils/fakes.ts`;
  - `server/utils/cloudinary.util.ts`, `server/utils/sendEmail.util.ts`.
- Test: `test/api/upstream.test.ts` (new), `test/api/fakes.test.ts`.

**Interfaces:**

- Produces:
  - `failNext(service: 'mail' | 'cloudinary'): Promise<void>` in `test/utils/fakes.ts`. It calls `POST /__fail?service=…`.
  - **In the fakes:** the next upload or destroy answers 500 `{ error: { message: 'fake failure' } }`, and the next mail is refused at RCPT with code 550. Each flag clears after one use and on `/__reset`.

- [ ] **Step 1: Write the failing tests.**
  - **In `fakes.test.ts`:**
    - after `failNext('cloudinary')`, a direct POST to `${fakesUrl}/v1_1/test/image/upload` answers 500, and the next one answers 200;
    - after `failNext('mail')`, nodemailer `sendMail` to the sink rejects.
  - **In `upstream.test.ts`:**
    - a MANAGER's valid post create after `failNext('cloudinary')` gives `UPSTREAM_FAILED` with `Could not upload the image, please try again.`, and the post count is unchanged;
    - a reset request for a known email after `failNext('mail')` gives `UPSTREAM_FAILED` with `Failed to send email, please try again`.

- [ ] **Step 2: Run the tests and watch them fail.**
  - Run: `pnpm test > …/task7.log 2>&1; tail -40 …/task7.log`
  - Expected: FAIL. `/__fail` is a 404 in the fakes, and the server answers 500 `INTERNAL`.

- [ ] **Step 3: Implement the change.**
  - **Fakes:** add the failure flags.
  - **`uploadCloudinary`:** drop the throwing callback, `try`/`catch` the awaited upload, and throw `UPSTREAM_FAILED` with the message above.
  - **`sendEmail`:** its catch throws `UPSTREAM_FAILED`, `Failed to send email, please try again`.

- [ ] **Step 4: Run the full suite.**
  - Run: `pnpm test`
  - Expected: PASS.

- [ ] **Step 5: Commit.** Use the message `fix(server/utils/): report Cloudinary and mail failures as 502`.

---

### Task 8: Store session handling

**Files:**

- Modify: `app/stores/userStore.ts`, `app/stores/postStore.ts`
- Test: `test/unit/userStore.test.ts`, `test/unit/postStore.test.ts` (new)

**Interfaces:**

- Consumes: `isAuthError` and `extractMessage` (Task 2), and `failEnvelope` (Task 2).
- Produces: `userStore.expireSession(): void`. It clears `currentUser`, `isAuthenticated`, `role` and the cookie, and sets `sessionExpired = true`. `handleAuthError` and `postStore` both use it.

- [ ] **Step 1: Write the failing tests.**
  - **`userStore.test.ts` additions:**
    - A wrong login, from `POST /api/auth` returning `failEnvelope(e, 'INVALID_CREDENTIALS', 'Invalid credential: please check email or password again')`, alerts that message. It leaves `sessionExpired` false and a pre-set cookie `'Bearer keep'` unchanged.
    - A `FORBIDDEN` from `PUT /api/user/admin` (for `setAdmin`) alerts and keeps `isAuthenticated` true. Seed it with `user.$patch({ isAuthenticated: true, currentUser: liveUser, role: 'USER' })`.
    - With no cookie, `updateUsername` makes no request and alerts `No user authentication found, please login`.
  - **`postStore.test.ts`:**
    - `UNAUTHENTICATED` from `DELETE /api/post/p1`: seed `posts` with a post by the current user. The store sets `sessionExpired`, clears the cookie, alerts the message and keeps the post in `posts`.
    - `FORBIDDEN` from `PUT /api/post/p1`: the store alerts the message, keeps `isAuthenticated` true and leaves the cookie.
    - `GET /api/post` answering `failEnvelope(e, 'INTERNAL', 'Something went wrong, please try again.')`: `getAllPosts()` alerts that message, and `posts` stays `[]`.

- [ ] **Step 2: Run the tests and watch them fail.**
  - Run: `pnpm vitest run --project unit test/unit/userStore.test.ts test/unit/postStore.test.ts`
  - Expected: FAIL.
    - postStore never expires the session.
    - The local no-cookie checks throw a plain `Error` that `isAuthError` no longer clears state for. The failing assertion depends on that test's setup, so read the output.

- [ ] **Step 3: Implement the changes.**
  - **`expireSession`:** add it and use it in `handleAuthError`.
    - With `isAuthError(err)`: call `expireSession()`, then return if `quiet`, otherwise alert.
    - Otherwise: alert only.
  - **Local no-cookie checks:** replace them with an early `alertStore.setAlert('No user authentication found, please login')` and a `return`.
  - **`handlePostError`:** with `isAuthError(err)`, call `userStore.expireSession()`, then alert.
  - **Unchanged:** `getCurrentUser`'s quiet handling and its unconditional cookie clear.

- [ ] **Step 4: Run the tests again and watch them pass.**
  - Run: `pnpm vitest run --project unit`
  - Expected: PASS.
  - Then run `pnpm test` (guards). Expected: PASS.

- [ ] **Step 5: Commit.** Use the message `feat(app/stores/): log out only on UNAUTHENTICATED, from either store`.

---

### Task 9: Page error handling

**Files:**

- Modify: `app/pages/posts/[id].vue`, `app/pages/admin/{posts,comments,users}.vue`
- Test:
  - `test/unit/postPage.test.ts` (new);
  - `test/unit/adminCommentsPage.test.ts` (new);
  - `test/unit/adminUsersPage.test.ts`, `test/unit/requestPage.test.ts`.

**Interfaces:**

- Consumes: `$api`, `extractMessage` and `isAuthError` (Task 2), and `userStore.expireSession` (Task 8).

- [ ] **Step 1: Write the failing tests.** All of them read alerts through `useAlertStore(useNuxtApp().$pinia as Pinia)`.
  - **`adminCommentsPage.test.ts`:**
    - `GET /api/comment` returns one comment; count its calls.
    - `DELETE /api/comment/c1` returns `failEnvelope(e, 'FORBIDDEN', 'Access denied.')`.
    - Clicking the delete button alerts `Access denied.`, and the GET count stays 1 (no refresh).
  - **`adminUsersPage.test.ts`:** add a case where the PUT returns `failEnvelope(e, 'FORBIDDEN', 'Access denied.')`. The alert is `Access denied.`, not `Successfully updated user role`.
  - **`postPage.test.ts`:**
    - Mount `/posts/p1` (`mountSuspended(PostPage, { route: '/posts/p1' })`) with `postStore.posts` seeded with p1 and a logged-in USER.
    - `GET /api/comment/p1` returns `[]`, and `POST /api/comment/p1` returns `failEnvelope(e, 'INTERNAL', 'Something went wrong, please try again.')`.
    - Emitting `submit-comment` from `CommentInput` alerts that message, not `Successfully created a comment!`.
  - **`requestPage.test.ts`:** add a case where send-token returns `failEnvelope(e, 'UPSTREAM_FAILED', 'Failed to send email, please try again')`. The alert is that message, and the page doesn't navigate.

- [ ] **Step 2: Run the tests and watch them fail.**
  - Run: `pnpm vitest run --project unit test/unit/adminCommentsPage.test.ts test/unit/adminUsersPage.test.ts test/unit/postPage.test.ts test/unit/requestPage.test.ts`
  - Expected: FAIL. The admin and comment actions have no try/catch, so the rejection is unhandled or the success alert shows. `requestPage` may already pass from Task 3. If so, keep it as a regression test and note that in the ledger.

- [ ] **Step 3: Add the try/catch to the page actions.**
  - **Pages:** comment add and delete in `posts/[id].vue`; `onDelete` in `admin/posts.vue` and `admin/comments.vue`; `onSubmit` in `admin/users.vue`.
  - **On failure:**
    - with `isAuthError(err)`, call `userStore.expireSession()` first;
    - alert `extractMessage(err)`;
    - skip the success alert and `refresh()`.
  - The `if (!cookie.value) return` guards stay.

- [ ] **Step 4: Run the tests again and watch them pass.**
  - Run: `pnpm vitest run --project unit`
  - Expected: PASS.

- [ ] **Step 5: Commit.** Use the message `fix(app/pages/): alert API failures on comment and admin actions`.

---

### Task 10: Docs and final verification

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the Conventions section in `CLAUDE.md`.**
  - **API routes:** the example becomes `export default defineApiRoute({ middleware: [checkAuth], handler: postController.updatePost })`. The upload sentence says the role check runs before `readFormDataText` and `uploadCloudinary`, so a refused or incomplete request never reaches Cloudinary.
  - **Errors:**
    - controllers throw `apiError(code, message)`;
    - the code table;
    - every response is the envelope;
    - the client uses `$api` / `useApi`, which throw `ApiError`, or a `NuxtError` whose `.data` is the envelope;
    - `isAuthError` is code `UNAUTHENTICATED` only;
    - `error.vue` is unchanged.
  - **Auth:** "a valid token whose user no longer exists gets 401 `UNAUTHENTICATED`".
  - **Client state:** remove the "(#15 splits 401/403)" caveat. A 401 `UNAUTHENTICATED` from either store, or from a page action, expires the session; `FORBIDDEN` and `INVALID_CREDENTIALS` only alert.

- [ ] **Step 2: Run the whole verification.**
  - Run: `pnpm format && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`
  - Expected: all clean.

- [ ] **Step 3: Run the spec's manual checks in `pnpm dev` with the local DB.**
  - Log in with a wrong password: an alert shows, and you stay logged out but not "expired".
  - Log in, delete that user in the local DB, then act: the session ends and you're sent to login.
  - As a USER, open `/admin`: redirected.
  - Add and delete a comment: both succeed with alerts.

- [ ] **Step 4: Commit.** Use the message `docs(CLAUDE.md): document API envelopes and error codes`.
