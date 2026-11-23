# User Loader, Indexes and Session Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish issue #15. Each request loads its logged-in user once, through a per-request DataLoader. An email password reset logs out every device. The database enforces unique names and one reset token per user, and indexes the hot queries. Emails become case-insensitive. Captions, comments and names get length limits. Reset flows become atomic. The three 2a minors get fixed.

**Architecture:**

- A request-scoped `DataLoader` (`server/utils/userLoader.util.ts`) feeds `checkAuth`, `requireRole` and every controller through `getCurrentUser(e)`.
- `checkAuth` becomes async: it verifies the JWT, loads the user and compares a `tokenVersion`.
- Limits live in one shared module used by the DTOs, the schemas, `readFormDataText` and the client forms.
- Indexes are declared on the Mongoose schemas and built by `autoIndex`.

**Tech Stack:** Nuxt 4 / Nitro / H3 1.15, Mongoose 9, Zod 4, `dataloader` 2.2.x, Vitest (`api` and `unit` projects), `@bobbykim/mcl-forms`.

**Spec:** `docs/superpowers/specs/2026-11-21-loader-indexes-design.md`

## Global Constraints

- Everything in CLAUDE.md:
  - routes stay thin and logic lives in controllers;
  - errors go through `apiError(code, message)`, and messages are user-facing sentences;
  - request bodies go through Zod DTOs;
  - Prettier style;
  - Conventional Commits with a path scope, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tests never reach the network: mail and Cloudinary go through `test/setup/fakes.ts`.
- Never use `SKIP_BUILD=1` for an `api` run after a server change, unless a build has run since.
- No API response changes shape:
  - every field the client reads today stays;
  - `password` and `tokenVersion` never appear in a response.
- The deploy must log no one out: a token without `v`, or a user without `tokenVersion`, counts as version 0.
- Use `.lean()` only on reads that return no field with a schema default, including populated paths. In this plan that's only the trimmed post list.
- Fixed copy:
  - Session: "Session expired, please log in again"
  - Caption: "Please write a caption." / "Captions can be at most 1000 characters."
  - Comment: "Please write a comment." / "Comments can be at most 500 characters."
  - Username: "Please enter a username." / "Usernames can be at most 30 characters."
  - Email: "Email addresses can be at most 254 characters."
  - Missing post: "Post not found"
  - Bad reset link: "This reset link is invalid or has expired."
  - Unreadable body: "The request could not be read."
  - Cloudinary delete: "Could not delete the image, please try again."
- Limits: caption 1–1000, comment 1–500, username 1–30, email ≤254. Each is measured after `trim()`, as JS string length (UTF-16), the same on client and server.
- Names stay case-sensitive and unique. Emails are trimmed and lowercased.

## Review Focus

1. **Two signups with the same name at the same moment.** One gets 201, and the other gets 409 `CONFLICT` from the unique index, never a 500. (Test in Task 5.)
2. **A token in the old format (no `v`) after its user resets their password.** It must stop working too. (Test in Task 4.)
3. **A request that changes its own user and then returns it.** `PUT /api/user/user-info/username` must return the new name, not the loader's cached copy. (Test in Task 3.)
4. **A logged-in route whose user was deleted, where the controller never used to load the user.** It now gets 401 "Session expired, please log in again" from `checkAuth`. (Test in Task 3.)
5. **Whitespace-only input** in a comment, caption, caption update or username gets the "Please write…" / "Please enter…" message, not a stored blank. (Tests in Task 1.)

---

### Task 1: Length limits and case-insensitive email (server)

**Files:**

- Create: `shared/dto/limits.ts`
- Modify:
  - `shared/dto/post/update-post-input.dto.ts`
  - `shared/dto/comment/comment-input.dto.ts`
  - `shared/dto/user/user-input.dto.ts`
  - `shared/dto/user/new-username-input.dto.ts`
  - `shared/dto/auth/auth-input.dto.ts`
  - `shared/dto/token/token-email-input.dto.ts`
  - `shared/models/{post,comment,user}.model.ts`
  - `server/utils/readContent.util.ts`
- Test: `test/api/limits.test.ts` (new) and `test/api/emailCase.test.ts` (new)

**Interfaces:**

- Produces:
  - `LIMITS = { caption: 1000, comment: 500, username: 30, email: 254 } as const`
  - `LIMIT_MESSAGES` with keys `captionEmpty`, `captionLong`, `commentEmpty`, `commentLong`, `usernameEmpty`, `usernameLong`, `emailLong`, holding the exact copy from Global Constraints. Both are exported from `shared/dto/limits.ts`, and Task 2 imports them as `#shared/dto/limits`.
  - `emailSchema`, a Zod schema (trim → lowercase → max 254 → `z.email({ message: 'Invalid email address' })`), exported from `shared/dto/limits.ts` and used by all three email DTOs.

- [ ] **Step 1: Write the failing tests.**

  In `test/api/limits.test.ts`, each refusal is asserted with `expectApiError(res, 'VALIDATION_FAILED')`. For the Zod routes, the test also checks that `res.json.error.details` contains `{ path, message }`. For a new post's caption it checks the top-level message, since `readFormDataText` throws directly.

  | Test                                                             | Request                                                                                                       | Expected                                                                                                             |
  | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
  | `refuses a caption over 1000 characters on create`               | MANAGER, multipart with `'x'.repeat(1001)`                                                                    | message "Captions can be at most 1000 characters.", and `cloudinaryCalls()` has no upload                            |
  | `accepts a caption of exactly 1000 characters`                   | MANAGER, multipart with `'x'.repeat(1000)`                                                                    | 201                                                                                                                  |
  | `refuses an over-long or blank caption update`                   | `PUT /api/post/:id` with `content: 'x'.repeat(1001)`, then `'   '`                                            | details `{ path: 'content', message: 'Captions can be at most 1000 characters.' }`, then `'Please write a caption.'` |
  | `refuses an over-long or blank comment`                          | `POST /api/comment/:postId` with `text: 'x'.repeat(501)`, then `'  '`                                         | details with path `text` and the comment copy                                                                        |
  | `refuses an over-long or blank username at signup and on update` | signup `name: 'n'.repeat(31)`; `PUT /api/user/user-info/username` with `username: 'n'.repeat(31)`, then `' '` | the username copy, paths `name` and `username`                                                                       |
  | `refuses an email over 254 characters`                           | signup with `` `${'a'.repeat(250)}@x.io` ``                                                                   | details path `email`, message "Email addresses can be at most 254 characters."                                       |

  In `test/api/emailCase.test.ts`:

  | Test                                                | Request                                                | Expected                                                                       |
  | --------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
  | `stores a signup email trimmed and lowercased`      | signup with `` ` Mixed-${n}@Example.Test ` ``          | the `users` doc's email is `` `mixed-${n}@example.test` ``                     |
  | `logs in with a differently-cased email`            | login with that email uppercased                       | 200 with an `accessToken`                                                      |
  | `refuses a signup whose email differs only by case` | signup again with the uppercased email                 | `CONFLICT` "That email address is already in use, please use a different one." |
  | `sends a reset link to a differently-cased email`   | `POST /api/token/send-token` with the uppercased email | `sentMail()` grows by 1                                                        |

- [ ] **Step 2: Run the tests and confirm they fail.**

  Run: `pnpm vitest run --project api test/api/limits.test.ts test/api/emailCase.test.ts`
  Expected: FAIL. Over-long values get 201/200, blank values 500/400 with other messages, mixed-case login gets 401.

- [ ] **Step 3: Implement.**
  - **`shared/dto/limits.ts`** as in Interfaces.
  - **DTOs:** each text field becomes `z.string().trim().min(1, <empty copy>).max(<limit>, <long copy>)`. Signup `name` and `username` use the username limits, `content` the caption limits, `text` the comment limits. The three email fields use `emailSchema`.
  - **Schemas, as a backstop:** `maxlength` on post `content` 1000, comment `text` 500, user `name` 30 and user `email` 254, plus `lowercase: true, trim: true` on user `email`.
  - **`readFormDataText`:** trim the caption, then throw `apiError('VALIDATION_FAILED', LIMIT_MESSAGES.captionLong)` when it's longer than `LIMITS.caption`. It stores the trimmed caption.

- [ ] **Step 4: Run the tests and confirm they pass, then run the whole api project.**

  Run: `pnpm vitest run --project api`
  Expected: all PASS. Fix any existing test that relied on untrimmed or empty text by changing the test only if the spec now requires the new behavior.

- [ ] **Step 5: Commit.**

  `feat(shared/dto/): length limits and case-insensitive email`

---

### Task 2: Limits in the client forms

**Files:**

- Modify:
  - `app/components/posts/CommentInput.vue`
  - `app/components/posts/ContentBlock.vue` (caption edit)
  - `app/pages/posts/index.vue` (new-post caption)
  - `app/pages/auth/signup.vue` (name)
  - `app/components/layout-components/UpdateUserInfo.vue` (username)
- Test:
  - `test/unit/formLimits.test.ts` (new)
  - extend `test/unit/postsPage.test.ts`

**Interfaces:**

- Consumes: `LIMITS` and `LIMIT_MESSAGES` from `#shared/dto/limits` (Task 1).

`MclTextArea` has no length prop and puts extra attributes on its wrapper `div`. So the textareas can't take `maxlength`. Instead they follow the CLAUDE.md convention: bind `:invalid` with `invalid-feedback`, and disable submit. `MclInputText` has a `maxLength` prop (`:max-length`).

- [ ] **Step 1: Write the failing tests.**

  Each test mounts its component with `mountSuspended`.

  | Test                                                                          | Setup                                                       | Expected                                                                                                                                           |
  | ----------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `CommentInput flags a comment over 500 characters and won't submit it`        | mount `CommentInput`, set the textarea to `'x'.repeat(501)` | the text "Comments can be at most 500 characters." is rendered, the submit button is `disabled`, and triggering `submit` emits no `submit-comment` |
  | `ContentBlock flags a caption over 1000 characters in edit mode`              | enter edit mode, set 1001 chars                             | the caption copy is shown, and save emits no `on-save`                                                                                             |
  | (in `postsPage.test.ts`) `new-post form flags a caption over 1000 characters` | set 1001 chars                                              | the copy is shown, and no `POST /api/post` is sent (`mockApi` handler never called)                                                                |
  | `username inputs cap at 30 characters`                                        | mount signup page and `UpdateUserInfo`                      | `#signup-name` and `#user-name` have `maxlength="30"`                                                                                              |

- [ ] **Step 2: Run and confirm they fail.**

  Run: `pnpm vitest run --project unit test/unit/formLimits.test.ts test/unit/postsPage.test.ts`
  Expected: FAIL. There's no feedback text and no `maxlength`.

- [ ] **Step 3: Implement.**
  - **Each textarea:** a `computed` "too long" flag (`text.trim().length > LIMITS.x`). Bind `:invalid` and `invalid-feedback` with `LIMIT_MESSAGES.xLong`. Disable submit while the flag is true, and return early from the submit handler when it is.
  - **The username inputs:** `:max-length="LIMITS.username"`.

- [ ] **Step 4: Run and confirm they pass, then run the whole unit project.**

  Run: `pnpm vitest run --project unit`
  Expected: all PASS.

- [ ] **Step 5: Commit.**

  `feat(app/components/): show length limits in the caption, comment and username forms`

---

### Task 3: Per-request user loader

**Files:**

- Create:
  - `server/utils/userLoader.util.ts`
  - `test/utils/profile.ts`
  - `test/api/userLoader.test.ts`
- Modify:
  - `package.json` (add `dataloader` ^2.2.3)
  - `server/utils/checkAuth.util.ts`
  - `server/utils/requireRole.util.ts`
  - `server/controller/{auth,post,comment,user}/*.controller.ts`

**Interfaces:**

- Produces:
  - `getCurrentUser(e: H3Event): Promise<HydratedDocument<UserModel>>`. It loads `e.context.user.id` through the request's loader, without the password. It throws `apiError('UNAUTHENTICATED', 'Session expired, please log in again')` when the user doesn't exist.
  - `userLoader(e: H3Event): DataLoader<string, HydratedDocument<UserModel> | null>`, created once per event and kept on `e.context`. The batch function is one `User.find({ _id: { $in: ids } }).select('-password')`, returned in key order with `null` for missing ids. The documents are hydrated, **not lean**.
  - `checkAuth: (e: H3Event) => Promise<void>`. It verifies the JWT, then calls `getCurrentUser(e)`.
- Removes:
  - `UserController.getCurrentUserData`
  - `UserController.getRawCurrentUserData`
  - the `findById` in `AuthController.getCurrentUser` (which now returns `getCurrentUser(e)`)
  - the `findById` in `requireRole`

- [ ] **Step 1: Write the test helper.**

  `test/utils/profile.ts` exports `userReadsFor(userId: string, fn: () => Promise<unknown>): Promise<number>`.
  1. Turn on the MongoDB profiler for the test database (`db.command({ profile: 2 })`).
  2. Run `fn`.
  3. Count the `system.profile` entries newer than the start time where `ns` ends in `.users`, `op === 'query'`, and the JSON of `command.filter` contains `userId`.
  4. Turn the profiler off again.

  Filtering by this fresh user's id keeps the count safe from other test files.

- [ ] **Step 2: Write the failing tests** in `test/api/userLoader.test.ts`.

  | Test                                                                    | Request                                                           | Expected                                                                                          |
  | ----------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
  | `GET /api/auth reads its user once`                                     | `signup()`                                                        | `userReadsFor(id, …)` is `1`; take `id` from the `users` doc by email                             |
  | `creating a post reads its user once`                                   | MANAGER, multipart post                                           | `1` (`checkAuth`, `requireRole` and the controller share one load)                                |
  | `updating a post reads its user once`                                   | author's `PUT /api/post/:id`                                      | `1`                                                                                               |
  | `deleting a comment reads its user once`                                | `DELETE /api/comment/:id`                                         | `1`                                                                                               |
  | `a username change returns the new name`                                | `PUT /api/user/user-info/username` with a fresh name              | the response `data.name` is the new name (Review Focus 3)                                         |
  | `a deleted user's token gets 401 on a route that never loaded the user` | `deleteUser(id)`, then `POST /api/comment/:postId` with its token | `expectApiError(res, 'UNAUTHENTICATED', 'Session expired, please log in again')` (Review Focus 4) |

- [ ] **Step 3: Run and confirm they fail.**

  Run: `pnpm vitest run --project api test/api/userLoader.test.ts`
  Expected: the read-count tests FAIL with 2 (or 3).

  If the profiler records nothing on `mongodb-memory-server`, the helper is wrong, not the code: fix the helper until the count is the current 2. That's a ruling.

  The two Review Focus tests may already pass. Record that, since they pin behavior this task must keep.

- [ ] **Step 4: Implement.**
  - `pnpm add dataloader@^2.2.3`
  - Write `userLoader.util.ts`.
  - Make `checkAuth` async and have it load the user.
  - Switch `requireRole` and every controller call site to `getCurrentUser(e)`.
  - `updatePassword` reads the hash with `User.findById(user._id).select('password')`.
  - After a write, return the write's result (`{ new: true }`); never re-read through the loader.
  - Type the loader on `H3EventContext` with a module augmentation in the util file.

- [ ] **Step 5: Run and confirm they pass, then run the full suite.**

  Run: `pnpm test && pnpm typecheck`
  Expected: all PASS.

- [ ] **Step 6: Commit.**

  `feat(server/utils/): load the current user once per request through a DataLoader`

---

### Task 4: Token version, atomic reset flows

**Files:**

- Create: `server/utils/sessionToken.util.ts`
- Modify:
  - `shared/models/user.model.ts`
  - `shared/models/token.model.ts`
  - `server/utils/checkAuth.util.ts`
  - `server/controller/{auth,user,token}/*.controller.ts`
- Test:
  - `test/api/sessionVersion.test.ts` (new)
  - extend `test/api/token.test.ts`

**Interfaces:**

- Consumes: `getCurrentUser` and async `checkAuth` (Task 3).
- Produces:
  - `signSessionToken(user: { _id: unknown; tokenVersion?: number }): string`. It returns `` `Bearer ${jwt.sign({ id: String(user._id), v: user.tokenVersion ?? 0 }, jwtSecret, { expiresIn: '7d' })}` ``. Login and signup use it, and `UserController.signToken` is removed.
  - `UserModel.tokenVersion: number` (default 0).
  - The user schema's `toJSON` transform deletes `password` and `tokenVersion`.
  - `tokens.userId` is unique.

- [ ] **Step 1: Write the failing tests.**

  In `sessionVersion.test.ts`. All tokens are checked with `GET /api/auth`. "Reset" means request a link with `POST /api/token/send-token` and use it with `POST /api/token/reset-password`, as `token.test.ts` does.

  | Test                                              | Setup                                                                            | Expected                                                                                                                                   |
  | ------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
  | `a token without a version still works`           | `insertUser()` (signs `{ id }` only)                                             | 200                                                                                                                                        |
  | `a reset logs out a token issued before it`       | `signup()`, then reset                                                           | the signup token gets `UNAUTHENTICATED` "Session expired, please log in again"; logging in with `NewPassw0rd!` gives a token that gets 200 |
  | `a reset also logs out an old-format token`       | `insertUser()`, then reset                                                       | its token gets 401 (Review Focus 2)                                                                                                        |
  | `a settings password change keeps other sessions` | `signup()` (token A), login (token B), `PUT /api/user/user-info/password` with B | A still gets 200                                                                                                                           |
  | `no response exposes tokenVersion or password`    | after a reset                                                                    | `GET /api/auth` `data` and the admin `GET /api/user/admin` items have neither key                                                          |

  In `token.test.ts`:

  | Test                                                   | Setup                                       | Expected                                                                                                                                             |
  | ------------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `two reset requests at once leave one token`           | `Promise.all` of two `requestReset(email)`  | `storedTokens(id)` has length 1, and of the two emailed links exactly one resets (200) and the other gets `VALIDATION_FAILED` with the bad-link copy |
  | `a reset link works once even when used twice at once` | `Promise.all` of two `resetWith(id, token)` | the statuses sorted are `[200, 400]`, and the 400 has the bad-link copy                                                                              |

- [ ] **Step 2: Run and confirm they fail.**

  Run: `pnpm vitest run --project api test/api/sessionVersion.test.ts test/api/token.test.ts`
  Expected: FAIL. The reset doesn't log anyone out, concurrent requests may leave 2 tokens, and a double use may give `[200, 200]`.

  A race test can pass by luck. If it does, run it 5 times. If it still passes, keep it as a regression test and ledger that the RED wasn't observable.

- [ ] **Step 3: Implement.**
  - **User schema:** add `tokenVersion` and the `toJSON` transform.
  - **`checkAuth`:** compare `(decoded.v ?? 0) !== (user.tokenVersion ?? 0)`, and answer 401 with the session copy when they differ.
  - **`sentToken`:** `Token.findOneAndUpdate({ userId }, { token: digest, createdAt: new Date() }, { upsert: true })`.
  - **`resetPasswordWithToken`:**
    1. Check the id with `parseObjectId`. If that throws, answer `badResetLink()`.
    2. `Token.findOneAndDelete({ userId: id, token: digest })`. If that finds nothing, answer `badResetLink()`.
    3. `User.updateOne({ _id: id }, { password: hash, $inc: { tokenVersion: 1 } })`. If `matchedCount === 0`, answer `badResetLink()`.
  - **The comment above the origin line also says:** "It trusts the Host header, which Vercel sets to the domain that was reached; behind any other proxy, make sure Host can't be spoofed."

- [ ] **Step 4: Run and confirm they pass, then run the full suite.**

  Run: `pnpm test && pnpm typecheck`
  Expected: all PASS.

- [ ] **Step 5: Commit.**

  `feat(server/utils/): a password reset logs out every device; atomic reset requests and links`

---

### Task 5: Indexes, and no comments on missing posts

**Files:**

- Modify:
  - `shared/models/{user,post,comment}.model.ts`
  - `server/controller/comment/comment.controller.ts`
  - `test/utils/auth.ts`
- Test: `test/api/indexes.test.ts` (new) and `test/api/ownership.test.ts` (or a new `comment.test.ts`)

**Interfaces:**

- Consumes: the unique `tokens.userId` from Task 4. This task's test checks it alongside the others.

- [ ] **Step 1: Make `insertUser` names unique across test files.**

  Today it's `` `user-${counter}` ``, which repeats in every file and would break the unique name index. Change it to `` `user-${userCounter}-${Date.now() % 1e8}` ``, which stays within 30 characters.

- [ ] **Step 2: Write the failing tests.**

  | Test                                                         | Setup                                                                  | Expected                                                                                                                            |
  | ------------------------------------------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
  | `the app builds its indexes`                                 | poll `listIndexes` for up to 5 s                                       | `users` has a unique `{ name: 1 }`, `posts` has `{ date: -1 }`, `comments` has `{ post: 1 }`, `tokens` has a unique `{ userId: 1 }` |
  | `two signups with one name at once: one wins, one conflicts` | `Promise.all` of two signups with the same `name` and different emails | statuses sorted `[201, 409]`; the 409 is `CONFLICT` (Review Focus 1)                                                                |
  | `a comment on a missing post gets 404`                       | `POST /api/comment/<new ObjectId>` with a valid token and text         | `expectApiError(res, 'NOT_FOUND', 'Post not found')`, and no comment is stored                                                      |

- [ ] **Step 3: Run and confirm they fail.**

  Run: `pnpm vitest run --project api test/api/indexes.test.ts`, plus the comment test file.
  Expected: FAIL. The indexes are missing, the concurrent signups give `[201, 201]`, and the missing post gives 201.

- [ ] **Step 4: Implement.**
  - **Indexes:** user `name: { unique: true }`, `postSchema.index({ date: -1 })` and comment `post: { index: true }`.
  - **`createNewComment`:** before saving, `if (!(await Post.exists({ _id: postId }))) throw apiError('NOT_FOUND', 'Post not found')`.

- [ ] **Step 5: Run and confirm they pass, then run the full suite.**

  Run: `pnpm test`
  Expected: all PASS.

- [ ] **Step 6: Commit.**

  `feat(shared/models/): indexes and unique names; refuse comments on missing posts`

---

### Task 6: Narrow types, lean trimmed list

This task is a refactor with no behavior change. The existing payload tests are its gate (`test/api/payloads.test.ts`, and `post.test.ts` "lists trimmed posts with no author at all").

**Files:**

- Modify:
  - `shared/types/model-dto.types.ts`
  - `server/controller/post/post.controller.ts`
  - `shared/models/post.model.ts`
  - `shared/models/comment.model.ts`

- [ ] **Step 1: Pin the trimmed shape.**

  Add `trimmed posts have exactly _id and imageId` to `post.test.ts`: every item's `Object.keys(...).sort()` equals `['_id', 'imageId']`. Run it, and it should PASS now. Then confirm that `__v` isn't there: `select('id imageId')` already excludes it.

- [ ] **Step 2: Implement.**
  - **Types:** `PostType.author` and `CommentType.author` become `Pick<UserType, '_id' | 'name'>`, and `CommentType.post` becomes `Pick<PostType, '_id' | 'date' | 'updatedAt'> | null`.
  - **`getAllTrimmedPost`:** both queries use `.lean()`.
  - **Cleanup:** delete the unused `PopulatedPostModel` and the commented-out `PopulatedCommentModel`.

- [ ] **Step 3: Verify.**

  Run: `pnpm typecheck && pnpm test`
  Expected: all PASS. If the client fails to typecheck where it passes `author` as a full `UserType`, fix the client type, not the narrowing.

- [ ] **Step 4: Commit.**

  `refactor(shared/types/): narrow populated author and post types; lean trimmed posts`

---

### Task 7: The three 2a minors

**Files:**

- Modify:
  - `server/utils/apiError.util.ts`
  - `server/utils/defineApiRoute.util.ts`
  - `server/utils/cloudinary.util.ts`
  - `server/controller/post/post.controller.ts`
- Test:
  - extend `test/unit/apiFailure.test.ts`
  - `test/unit/defineApiRoute.test.ts` (new)
  - extend `test/api/upstream.test.ts` and `test/api/inputErrors.test.ts`

- [ ] **Step 1: Write the failing tests.**

  | Test                                                    | Where                    | Expected                                                                                                                                                                                                                                       |
  | ------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `replaces a bare reason phrase with a sentence`         | `apiFailure.test.ts`     | `failure(createError({ statusCode: 400, statusMessage: 'Bad Request' })).body.error` equals `{ code: 'VALIDATION_FAILED', message: 'The request could not be read.' }`. The existing `'Nope'` cases still pass.                                |
  | `answers malformed JSON with a sentence`                | `inputErrors.test.ts`    | `api('POST', '/api/auth', { raw: '{bad', headers: { 'content-type': 'application/json' } })` gives `VALIDATION_FAILED` "The request could not be read."                                                                                        |
  | `answers data: null when the handler returns undefined` | `defineApiRoute.test.ts` | Call `defineApiRoute({ handler: () => undefined })` on an H3 event built from Node `IncomingMessage`/`ServerResponse` (h3 `createEvent`). The result equals `{ ok: true, data: null }`.                                                        |
  | `a failed image delete keeps the post and its comments` | `upstream.test.ts`       | ADMIN, `insertPost` and `insertComment`, `failNext('cloudinary')`, `DELETE /api/post/:id` gives `UPSTREAM_FAILED` "Could not delete the image, please try again.", and `exists('posts', id)` and `exists('comments', cid)` are both still true |

- [ ] **Step 2: Run and confirm they fail.**

  Run: `pnpm vitest run --project unit test/unit/apiFailure.test.ts test/unit/defineApiRoute.test.ts && pnpm vitest run --project api test/api/upstream.test.ts test/api/inputErrors.test.ts`
  Expected: FAIL. The message is "Bad Request", `data` is missing, and the delete gives 500 with the comments gone.

  Check that `failNext('cloudinary')` also fails the `/image/destroy` call in `test/setup/fakes.ts`. If it only fails uploads, extend the fake. That's a ruling.

- [ ] **Step 3: Implement.**
  - **`toApiFailure`:** an H3 4xx whose `statusMessage` is empty or equals `STATUS_CODES[statusCode]` (from `node:http`) answers "The request could not be read." under `codeForStatus(statusCode)`.
  - **`defineApiRoute`:** `data: data ?? null`.
  - **`deleteCloudinaryImage`:** wrap the error in `apiError('UPSTREAM_FAILED', 'Could not delete the image, please try again.')`. A resolved `{ result: 'not found' }` is success.
  - **`deletePostById`:** delete the image first, then the comments, then the post. Update the comment there.

- [ ] **Step 4: Run and confirm they pass, then run the full suite.**

  Run: `pnpm test`
  Expected: all PASS.

- [ ] **Step 5: Commit.**

  `fix(server/utils/): sentence for unreadable bodies, null data, 502 on image delete failure`

---

### Task 8: check-db script, docs, walkthrough

**Files:**

- Add: `scripts/check-db.ts` (already written and untracked, as the owner ran it)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Verify the script.**

  Run: `pnpm exec eslint scripts/check-db.ts && pnpm exec prettier --check scripts/check-db.ts`, then run it against the local Docker DB with `NUXT_MONGO_URI='mongodb://mongo:123@localhost:8080/test?authSource=admin' node scripts/check-db.ts`.
  Expected: lint is clean, and it prints "No blockers" after `pnpm dev` has run once. It also lists the new indexes on the local DB.

- [ ] **Step 2: Update CLAUDE.md.**
  - **Command table row:** `node --env-file=<env file> scripts/check-db.ts` — read-only check before index changes (duplicates, lengths, missing defaults, indexes).
  - **Auth bullet:**
    - `checkAuth` is async: it loads the user through the per-request loader and compares the JWT's `v` with `tokenVersion`;
    - an email reset bumps `tokenVersion`;
    - controllers get the user with `getCurrentUser(e)`, never their own `findById`.
  - **Validation bullet:** the limits live in `shared/dto/limits.ts`, and the client forms import the same constants.
  - **New bullet:** use `.lean()` only where no returned field has a schema default (production has old documents missing `role` and `updatedAt`).

- [ ] **Step 3: Run the full CI set.**

  Run: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`
  Expected: all PASS.

- [ ] **Step 4: Walk through in `pnpm dev`** (local DB only), with the headless browser:
  - sign up with a mixed-case email, log out, and log in with it lowercased;
  - a 501-character comment shows the feedback and can't be sent;
  - a 31-character username can't be typed.

  Then clean up only the users, posts and comments you created.

- [ ] **Step 5: Commit.**

  `docs(CLAUDE.md): document the user loader, token version, limits and check-db` (it includes `scripts/check-db.ts` as `chore(scripts/)`, in a separate commit)
