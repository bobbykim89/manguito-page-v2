# Security Fixes (#15 part 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the live security holes and the broken author checks without changing the response format.

**Architecture:**

- The API tests gain two local fakes, a mail sink and a fake Cloudinary, so the reset email and the image upload and delete paths can be tested without network access.
- Each fix then lands test-first in its controller, DTO or route.
- One new request middleware, `requireRole`, runs ahead of the Cloudinary upload.

**Tech Stack:**

- Nuxt 4 / Nitro / H3, Mongoose 9, Zod 4, nodemailer 10, cloudinary 2.11.
- Vitest (`api` and `unit` projects).
- `smtp-server` (new dev dependency).

**Spec:** `docs/superpowers/specs/2026-11-19-security-fixes-design.md`

## Global Constraints

- Response shapes and status codes are unchanged except where this plan says otherwise. Envelopes and 401/403 are part 2.
- Production behaviour of `sendEmail` must not change. The new config defaults are `smtp.gmail.com`, `465` and `secure: true`.
- No test may reach the network. Mail goes to the local sink, and Cloudinary calls go to the local fake.
- Conventions:
  - commits follow Conventional Commits with a path scope and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  - run `pnpm lint` and `pnpm format` before each commit;
  - never read `.env*`.
- Exact copy: the send-token response message and the request page alert are both `If that email has an account, we've sent a reset link.`

## Review Focus

1. **Spoofed forwarding headers.** A reset request carrying `X-Forwarded-Host: evil.example` must still produce a link on the server's own host. It is pinned in Task 2.
2. **Behind Vercel's HTTPS proxy** (`X-Forwarded-Proto: https`), the link must be `https://`, or the token travels over plain HTTP. It is pinned in Task 2.
3. **Two reset requests in a row.** Only the newest link works. It is pinned in Task 2.
4. **The stored database value used as the token** (the old scheme's weakness) must be rejected. It is pinned in Task 2.
5. **An unknown email and a known email** must get byte-identical response bodies and status codes. It is pinned in Task 2.

The response _timing_ still differs (the known path sends mail), which is accepted for now.

---

### Task 1: Local mail sink and fake Cloudinary for the API tests

**Files:**

- Modify: `server/utils/sendEmail.util.ts`, `nuxt.config.ts` (runtimeConfig), `test/setup/global.ts`, `package.json` (dev dependency `smtp-server` and `@types/smtp-server`)
- Create: `test/setup/fakes.ts`, `test/utils/fakes.ts`, `test/api/fakes.test.ts`
- Modify: `CLAUDE.md` (Tests section: one line on the fakes)

**Interfaces:**

- Produces, in `test/utils/fakes.ts` (a test-side client that talks to the fakes over HTTP, since tests run in worker processes):
  - `sentMail(): Promise<Array<{ to: string; subject: string; text: string }>>` returns every message since the last reset. `text` is decoded from quoted-printable.
  - `cloudinaryCalls(): Promise<Array<{ method: string; path: string }>>`.
  - `resetFakes(): Promise<void>`.
  - `resetLinkIn(text: string): URL` returns the first `http(s)://…/auth/reset-password?…` URL in a mail body.
- Produces the `fakesUrl` value via vitest `provide`/`inject`.
- Produces `runtimeConfig.mailerHost` (default `'smtp.gmail.com'`), `mailerPort` (`465`) and `mailerSecure` (`true`), overridable with `NUXT_MAILER_HOST`, `NUXT_MAILER_PORT` and `NUXT_MAILER_SECURE`.

**Steps:**

- [ ] **Step 1: Write the failing test** in `test/api/fakes.test.ts`:

```ts
it('delivers the reset email to the local sink', async () => {
  await resetFakes()
  const { email } = await insertUser()
  const res = await api('POST', '/api/token/send-token', {
    body: { email, url: inject('baseUrl') },
  })
  expect(res.status).toBe(200)
  const mail = await sentMail()
  expect(mail).toHaveLength(1)
  expect(mail[0]!.to).toBe(email)
})
```

`insertUser` in `test/utils/auth.ts` now also returns the `email` it inserted (`{ id, token, email }`).

- [ ] **Step 2: Run it.**
  - Run: `pnpm vitest run --project api test/api/fakes.test.ts`
  - Expected: FAIL, because `test/utils/fakes.ts` doesn't exist yet. Once the helpers exist, it fails with status 500 "Failed to send email" because the mail goes to Gmail with fake credentials.

- [ ] **Step 3: Build the fakes.**
  - `test/setup/fakes.ts` exports `startFakes(): Promise<{ smtpPort: number; httpUrl: string; stop(): Promise<void> }>`, holding two servers.
  - **The SMTP sink** (`smtp-server`):
    - options: `authOptional: true`, `allowInsecureAuth: true`, `disabledCommands: ['STARTTLS']`, and an `onAuth` callback that accepts anything;
    - it stores the raw message for each delivery.
  - **The HTTP server** (`node:http`):
    - Cloudinary: `POST /v1_1/:cloud/image/upload` answers `{"public_id":"fake-folder/fake-id"}`, and `POST /v1_1/:cloud/image/destroy` answers `{"result":"ok"}`. Both record `{ method, path }`.
    - Control: `GET /__mail` and `GET /__cloudinary` return what was recorded, and `POST /__reset` clears it.
  - `global.ts`:
    - starts the fakes before the server and stops them in teardown;
    - provides `fakesUrl`;
    - adds to the server env: `NUXT_MAILER_HOST=127.0.0.1`, `NUXT_MAILER_PORT=<smtpPort>`, `NUXT_MAILER_SECURE=false`, and `CLOUDINARY_URL=cloudinary://k:s@test?upload_prefix=<httpUrl>`.
  - The Cloudinary SDK reads `upload_prefix` from `CLOUDINARY_URL` and switches to `http` for an `http:` prefix (`cloudinary/lib/config.js`, `lib/uploader.js:9-12`). The runtimeConfig `cloudinary.config({...})` call only adds the cloud name and keys.

- [ ] **Step 4: Make the mail host configurable.**
  - `sendEmail` uses `host: config.mailerHost`, `port: Number(config.mailerPort)` and `secure: Boolean(config.mailerSecure)`.
  - Drop `service: 'Gmail'`; nodemailer's well-known service entry fills keys that aren't set, so it isn't needed with explicit values.
  - Add the three keys to `runtimeConfig` with the Gmail defaults.

- [ ] **Step 5: Run it.**
  - Run: `pnpm vitest run --project api test/api/fakes.test.ts`
  - Expected: PASS.
  - Then run `pnpm test`. Expected: all green (49 + 1).

- [ ] **Step 6: Commit.**
  - Message: `test(test/setup/): local mail sink and fake Cloudinary for the API tests`. Include the CLAUDE.md line, the `sendEmail` config, and the new dev dependencies.
  - If the `pnpm install` for `smtp-server` asks for a build approval, add it to `allowBuilds`. It shouldn't need one.

### Task 2: Password reset — origin-based link, random token stored hashed, no account disclosure

**Files:**

- Modify:
  - `server/controller/token/token.controller.ts`
  - `shared/dto/token/token-email-input.dto.ts`
  - `server/api/token/send-token.post.ts` (only if needed)
  - `app/pages/auth/request.vue`
- Create: `server/utils/resetToken.util.ts`, `test/api/token.test.ts`, `test/unit/requestPage.test.ts`

**Interfaces:**

- Consumes `sentMail`, `resetFakes` and `resetLinkIn` from Task 1, and `insertUser(role)` → `{ id, token, email }`.
- Produces in `server/utils/resetToken.util.ts` (auto-imported):
  - `createResetToken(): { token: string; digest: string }` (32 random bytes as hex, and its SHA-256 hex digest);
  - `digestResetToken(token: string): string`.
- Produces `tokenEmailInputSchema = z.object({ email })`. `url` is removed, so unknown keys are stripped.

**Steps:**

- [ ] **Step 1: Write the failing API tests** in `test/api/token.test.ts`. Use `beforeEach(resetFakes)`. A helper `requestReset(email, headers?)` posts to `/api/token/send-token` with `{ email, url: 'https://evil.example' }`. The `url` is deliberately included to prove it's ignored.
  - `'links to the server it was requested from, not the url in the body'`: the link's origin is `inject('baseUrl')`.
  - `'ignores X-Forwarded-Host'`: with header `x-forwarded-host: evil.example`, the link's host is the `baseUrl` host.
  - `'uses https behind an https proxy'`: with header `x-forwarded-proto: https`, the link's protocol is `https:`.
  - `'answers the same for an unknown email and sends nothing'`:
    - the status and `JSON.stringify(json)` are equal for a known and an unknown email;
    - the message is the exact copy;
    - `sentMail()` has length 1, for the known email only.
  - `'stores only a digest of the emailed token'`:
    - the link's `token` matches `/^[0-9a-f]{64}$/`;
    - the user's `tokens` documents number exactly 1;
    - the stored `token` is not equal to the link token;
    - the stored `token` equals `createHash('sha256').update(linkToken).digest('hex')`.
  - `'resets the password once with the emailed token'`:
    - POST `/api/token/reset-password` with `{ userId, token, password: 'NewPassw0rd!' }` → 200;
    - the user's `tokens` count is 0;
    - repeating the same request → 400.
  - `'rejects the stored value as a token'`: reset with the database's stored `token` → 400.
  - `'a new request replaces the old link'`: request twice, then the first link's token → 400 and the second → 200.

  The tests read the tokens collection through `db()`. The model name is `token`, so check the actual collection name in `shared/models/token.model.ts`.

  Login after a reset is out of scope: `insertUser` stores a fake hash, so check the stored password changed instead.

- [ ] **Step 2: Run it.**
  - Run: `pnpm vitest run --project api test/api/token.test.ts`
  - Expected: FAIL. The origin is `evil.example`, the unknown email gets 400, the token isn't 64 hex characters, and the stored value equals the link token.

- [ ] **Step 3: Implement.**
  - `resetToken.util.ts` with `randomBytes` and `createHash` from `node:crypto`.
  - `sentToken`:
    - parse `{ email }`. An unknown user returns the generic body at once.
    - Otherwise `deleteMany({ userId })`, save the `digest`, and build the link from `getRequestURL(e, { xForwardedProto: true }).origin` (never `xForwardedHost`) with `?user=<id>&token=<token>`. Keep the email copy.
    - Return `{ status: 200, message: "If that email has an account, we've sent a reset link." }` on both paths.
  - `resetPasswordWithToken`: look up `findOne({ userId, token: digestResetToken(token) })`. The rest is unchanged.
  - Remove `hashPassword` use and the `Math.random` token, along with any `UserController` dependency that only served it.

- [ ] **Step 4: Run it.**
  - Run: `pnpm vitest run --project api test/api/token.test.ts test/api/fakes.test.ts`
  - Expected: PASS.

- [ ] **Step 5: Write the failing unit test** in `test/unit/requestPage.test.ts`. Use `resetState`, `mockApi('POST', '/api/token/send-token', …)` capturing the body with `readBody`, and `mountSuspended` of `@/pages/auth/request.vue`.
  - `'sends only the email'`: the captured body equals `{ email: 'kiwi@example.test' }`.
  - `'tells the user to check for a link'`: the alert store's message is the exact copy. Read it via `useAlertStore()` and check the store's field name in `app/stores/alertStore.ts`.
  - Run: `pnpm vitest run --project unit test/unit/requestPage.test.ts`
  - Expected: FAIL. The body has `url`, and the message is "Please check your email".

- [ ] **Step 6:** In `request.vue`, send `body: { email: emailInputRef.value }` and set the alert to the exact copy. Rerun the step 5 command. Expected: PASS.

- [ ] **Step 7: Commit.** Message: `fix(server/controller/token/): build reset links from the request origin and store only a token digest`.

### Task 3: Ownership checks compare ids

**Files:**

- Modify: `server/controller/post/post.controller.ts` (`updatePost`, `deletePostById`), `server/controller/comment/comment.controller.ts` (`deleteCommentById`)
- Create: `test/api/ownership.test.ts`; seed helpers `insertPost(authorId)` → `postId` and `insertComment(authorId, postId)` → `commentId` in `test/utils/content.ts`, inserting through `db()` with the fields the models require

**Interfaces:**

- Consumes `insertUser` and `cloudinaryCalls`/`resetFakes` from Task 1.

**Steps:**

- [ ] **Step 1: Write the failing tests.**
  - `'the author can edit their post'`:
    - PUT `/api/post/:id` with `{ content: 'edited' }` → 200, and `json.content` is `'edited'`.
    - The author's role is `MANAGER`.
  - `'another user cannot edit the post'`: an `ADMIN` who isn't the author → 401. Admins can't edit either, as now.
  - `'the author can delete their post'`:
    - DELETE → 200 and the post is gone from the database;
    - `cloudinaryCalls()` contains one `POST` whose path ends in `/image/destroy`.
  - `'a non-author manager cannot delete the post'` → 401, and the post still exists.
  - `'an admin can delete any post'` → 200.
  - `'the author can delete their comment'` (author role `USER`) → 200, and the comment is gone.
  - `'another user cannot delete the comment'` → 401.

- [ ] **Step 2: Run it.**
  - Run: `pnpm vitest run --project api test/api/ownership.test.ts`
  - Expected: the three "author can" tests FAIL with 401. The rest PASS already, which is acceptable because they guard against loosening.

- [ ] **Step 3:** Replace each `x.author !== user._id` with `!x.author.equals(user._id)`.

- [ ] **Step 4:** Run the step 2 command. Expected: PASS.

- [ ] **Step 5: Commit.** Message: `fix(server/controller/): compare author ids so authors can edit and delete their own content`.

### Task 4: Role check before the Cloudinary upload

**Files:**

- Create: `server/utils/requireRole.util.ts` (export it from `server/utils/index.ts`), `test/api/postCreate.test.ts`
- Modify: `server/api/post/index.post.ts`, `CLAUDE.md` (the API routes convention: role middleware before uploads)

**Interfaces:**

- Produces `requireRole(...roles: UserRoleType[]): (e: H3Event) => Promise<void>`. It loads `User.findById(e.context.user.id)`.
  - A missing user gets 401 `Session expired, please log in again`.
  - A role not in `roles` gets 401 with statusMessage `Access denied: unauthorized user`, the same as the controller's current check.

**Steps:**

- [ ] **Step 1: Write the failing tests.** The multipart body has `image` (a tiny PNG `Blob`, type `image/png`) and `content`, sent via `api(..., { raw: formData, token })`.
  - `'a user cannot create a post and nothing is uploaded'` → 401, and `cloudinaryCalls()` has no path ending in `/image/upload`.
  - `'a manager creates a post'` → 200, `json.imageId` is `'fake-folder/fake-id'`, and one upload was recorded.

- [ ] **Step 2: Run it.**
  - Run: `pnpm vitest run --project api test/api/postCreate.test.ts`
  - Expected: the first test FAILS, because an upload was recorded.

- [ ] **Step 3:** Write `requireRole` and add `defineRequestMiddleware(requireRole('ADMIN', 'MANAGER'))` between `checkAuth` and the upload middleware. The controller keeps its check.

- [ ] **Step 4:** Run the step 2 command. Expected: PASS.

- [ ] **Step 5: Commit.** Message: `fix(server/api/post/): check the role before uploading to Cloudinary`.

### Task 5: Authors expose only `_id` and `name`

**Files:**

- Modify: `server/controller/post/post.controller.ts` (all four `populate('author', …)` calls)
- Test: `test/api/post.test.ts`

**Steps:**

- [ ] **Step 1: Write the failing tests** in `test/api/post.test.ts`, seeding with `insertPost`.
  - `'lists posts without author emails'`: `Object.keys(json[0].author).sort()` equals `['_id', 'name']` for GET `/api/post`.
  - The same check for GET `/api/post/trimmed`.

- [ ] **Step 2: Run it.**
  - Run: `pnpm vitest run --project api test/api/post.test.ts`
  - Expected: FAIL. The keys include `email`, `role`, `date`, `updatedAt` and `__v`.

- [ ] **Step 3:** Change the projection to `'name'` in all four calls. That covers create and update too; Task 4's manager test and Task 3's edit test exercise those paths.

- [ ] **Step 4:** Run the step 2 command. Expected: PASS.

- [ ] **Step 5: Commit.** Message: `fix(server/controller/post/): return only the author's id and name`.

### Task 6: Role input accepts exactly MANAGER or USER

**Files:**

- Modify: `shared/dto/user/set-user-role-input.dto.ts`
- Test: `test/api/userRole.test.ts`

**Steps:**

- [ ] **Step 1: Write the failing tests.** As `ADMIN`, PUT `/api/user/admin/:id` for a `USER`:
  - `{ role: 'SUPERUSER' }` → 400, and the stored role is still `USER`;
  - `{ role: 'MANAGER' }` → 200.

  Check the controller body for any other field it reads.

- [ ] **Step 2: Run it.**
  - Run: `pnpm vitest run --project api test/api/userRole.test.ts`
  - Expected: the `SUPERUSER` case FAILS with 200.

- [ ] **Step 3:** `role: z.enum(['MANAGER', 'USER'])`.

- [ ] **Step 4:** Run the step 2 command. Expected: PASS. Then run `pnpm typecheck`, since `SetUserRoleInput` narrows and callers in `app/` may need the literal type.

- [ ] **Step 5: Commit.** Message: `fix(shared/dto/user/): accept only MANAGER or USER as a role`.

### Task 7: Full verification

- [ ] Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test`. All must pass.
- [ ] In `pnpm dev` (local DB), request a reset on `/auth/request` for an email with **no** account. This sends no mail, whatever `.env.local` holds. The alert should show the new copy. The real email check happens on the Vercel preview (the owner checks it).
