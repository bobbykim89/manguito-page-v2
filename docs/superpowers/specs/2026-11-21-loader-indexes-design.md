# User loader, indexes and session fixes (issue #15, part 2b)

## Why

The owner asked for "the dataloader pattern for the items that are handling many data and populating data". Part 2a (#31) gave every response the `{ ok, data }` envelope. This part finishes #15:

- the performance work: a per-request user loader, indexes, `.lean()` reads where safe, and length limits;
- the leftovers from the part 1 security review;
- three server-side minors from the 2a review.

Today:

- **A logged-in request loads its own user two or three times.** `checkAuth` only verifies the JWT. Then `requireRole` loads the user, and the controller loads it again (`getCurrentUserData` / `getRawCurrentUserData`, or `authController.getCurrentUser`).
- **Lists don't have an N+1 problem.** `populate('author', 'name')` already fetches all the authors of a list in one `$in` query. So the repeated loading of the current user is where the loader actually pays off.
- **The only index is the unique `email`**, plus the TTL index on `tokens.createdAt`. Posts are sorted by `date`, and comments are read and deleted by `post`, both without indexes. Usernames are unique only because `checkUniqueUsername` checks first.
- **A login token can't be cancelled.** JWTs carry only `{ id }` and last 7 days, so a password reset doesn't log out a device that someone else has.
- **Email lookup is case-sensitive**, so `A@x.com` and `a@x.com` would be two accounts.
- **Two reset requests at the same moment can leave two live tokens**, because `sentToken` runs `deleteMany` and then `save`. A reset link can also be used twice at the same moment, because the token is deleted only after the password is saved.
- **There are no length limits** on captions, comments or names.

### What production holds

The owner ran the read-only `scripts/check-db.ts` against production on 2026-11-21.

- **Counts:** 10 users, 169 posts, 16 comments, 0 reset tokens.
- **Emails:** none share an address ignoring case, and none have capitals or spaces.
- **Names:** two users share one name exactly: `611ec9b5…` (2021-08-19) and `611f4b8b…` (2021-08-20). **The owner will rename the newer one before deploying.** That's the only thing blocking a unique name index.
- **Longest values:** caption 149 characters, comment 46, name 15, email 25.
- **Dangling data:** one comment from 2021-09 points at a deleted post. Every author exists.

## Goals

1. **Each request loads its logged-in user from the database at most once.** It goes through a per-request loader (the `dataloader` package), whatever combination of `checkAuth`, `requireRole` and the controller needs the user.
2. **A password reset by email logs out every device.** A token issued before the reset answers 401 `UNAUTHENTICATED`, and the client's existing `expireSession` path handles it.
3. **Indexes** exist for every query the app runs often, and the database enforces unique emails, names and one reset token per user.
4. **Emails are compared without regard to case or surrounding spaces** at signup, login and reset request.
5. **Long or empty captions, comments and names are refused** with a sentence the user can act on.
6. **Requesting and using a reset link are atomic.** Two requests leave one live token, and one link resets the password once.
7. **The three 2a minors are fixed:** malformed JSON answers a sentence, a handler that returns `undefined` answers `data: null`, and a failed Cloudinary delete answers 502.

## Non-goals

- **Changing the password in settings does not log out other devices** (the owner's choice). Only the email reset does.
- **Lists keep Mongoose `populate`.** It already batches authors into one query, so routing authors through the loader would add code without saving a query.
- Pagination (#18), the stores refactor and the client-side minors from 2a (#16), and image uploads (#17).
- Case-insensitive usernames. Names stay unique exactly as typed, which matches today's signup check.
- A migration or backfill script. The data is clean apart from the duplicate name, which the owner fixes by hand.

## Anti-goals

These would make the work a failure even if every test passed:

- **The deploy logs everyone out.** Tokens issued before it carry no version, and they must keep working.
- **Any API response changes shape.** Every field the client reads today stays (`_id`, `author._id`, `author.name`, and so on). The existing API tests pin this.
- **A stale cached user is used after a write.** If a request loads its user and then changes it, nothing later in that request may read the old copy as if it were current.
- **An index build fails silently in production and nobody notices.** That's why the deploy checklist below runs `check-db` again.

## Constraints

- Everything in CLAUDE.md:
  - thin routes, controllers holding the logic, `apiError` codes and messages;
  - Zod DTOs for request bodies;
  - Node 24 and pnpm 12, with build scripts allowed explicitly;
  - tests never reach the network.
- `dataloader` is CommonJS, which is fine with require-of-ESM disabled (the test server runs that way, like Vercel). It has no build script.
- The messages below are fixed copy, because users see them.

## Approaches

The open choice was where the dataloader pattern applies. The owner picked option 1.

1. **A per-request user loader for the logged-in user (chosen).** A `DataLoader` per request batches and caches user lookups by id. `checkAuth`, `requireRole` and the controllers all read the current user through it. Lists keep `populate`, as one batched query. The repeated loading this removes is real, and it makes the token-version check in `checkAuth` free.
2. **The same loader, also used for post and comment authors.** Lists would be filled in through the loader instead of `populate`. It's still one query per list, so nothing gets faster, and there's more code that bypasses the Mongoose behavior the rest of the code expects.
3. **A plain per-request cache of the current user, with no package.** It does the same for the logged-in user, but it doesn't batch, so a later feature that loads several users would have to redo it.

## Design

### Per-request user loader

- **`server/utils/userLoader.util.ts`.** It exposes:
  - a getter that returns this request's loader, created on first use and kept on `event.context`;
  - `getCurrentUser(event)`, which loads `event.context.user.id` through that loader.

  The batch function runs one `User.find({ _id: { $in: ids } })` with no password, and returns the results in key order, `null` for ids that don't exist. The documents are hydrated, not lean, so missing defaults like `role` are filled in (see `.lean()` below).

- **`checkAuth` becomes async.** After verifying the JWT it loads the user through the loader.
  - A missing user answers 401 `UNAUTHENTICATED`, "Session expired, please log in again". This now applies to every `checkAuth` route, not only those that later loaded the user.
  - A token-version mismatch (below) gets the same answer.
- **`requireRole` and every controller method** that needs the current user call `getCurrentUser(event)` instead of their own `findById`. That covers the post, comment, user and auth controllers. `getCurrentUserData` and `getRawCurrentUserData` go away, along with `authController.getCurrentUser`'s own query.
- **`updatePassword` needs the password hash, which the loader doesn't load.** It reads the hash with its own query. That's the only route with a second user read.
- **After a write, a request doesn't read its user through the loader again.** It uses the value the write returned, as today (`findByIdAndUpdate(..., { new: true })`).

### Logging out every device on a password reset

- `User` gets `tokenVersion: Number`, defaulting to 0.
- The JWT payload becomes `{ id, v }`, where `v` is the user's `tokenVersion` when signed. Login and signup sign through one helper that takes the user.
- `checkAuth` compares `decoded.v ?? 0` with `user.tokenVersion ?? 0`. If they differ, it answers 401 as above. Old tokens have no `v`, and old users have no `tokenVersion`, so both count as 0 and **the deploy logs no one out**.
- `resetPasswordWithToken` saves the new password and `$inc`s `tokenVersion` in one update.
- A settings password change leaves `tokenVersion` alone (non-goal).

### Indexes

Mongoose builds these automatically on startup (`autoIndex` stays at its default). Index builds on collections this size are instant.

| Collection | Index                           | Why                                                                                      |
| ---------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `users`    | `email` unique (exists)         | login, signup and reset lookup                                                           |
| `users`    | `name` unique, **new**          | the database enforces unique names; `checkUniqueUsername` stays for the friendly message |
| `posts`    | `date: -1`, **new**             | every list sorts by date                                                                 |
| `comments` | `post: 1`, **new**              | comments by post, and the cascade on post delete                                         |
| `tokens`   | `userId` unique, **new**        | one live reset token per user                                                            |
| `tokens`   | `createdAt` TTL 3600 s (exists) | unchanged                                                                                |

If two signups claim the same name at the same moment, the second hits E11000. `toApiFailure` already answers that with `CONFLICT` "That value is already in use."

### Email case

- Every email input (signup, login, send-token) is trimmed and lowercased in its Zod DTO before validation and lookup.
- The `User` schema adds `lowercase: true, trim: true` as a backstop.
- Production emails are already lowercase, so no data changes.

### Length limits

The limits are enforced in the DTOs. Captions on new posts also go through `readFormDataText`, which isn't Zod, and it applies the same limit there. Each field is trimmed first. The `maxlength` values are mirrored on the Mongoose schemas as a backstop.

| Field                                        | Min | Max  | Too short                          | Too long                                         |
| -------------------------------------------- | --- | ---- | ---------------------------------- | ------------------------------------------------ |
| post caption (`content`), create and update  | 1   | 1000 | "Please write a caption."          | "Captions can be at most 1000 characters."       |
| comment `text`                               | 1   | 500  | "Please write a comment."          | "Comments can be at most 500 characters."        |
| user `name` (signup) and `username` (update) | 1   | 30   | "Please enter a username."         | "Usernames can be at most 30 characters."        |
| `email` everywhere                           | –   | 254  | (existing "Invalid email address") | "Email addresses can be at most 254 characters." |

- A Zod failure answers 400 `VALIDATION_FAILED` "Some fields are invalid.", with the sentence in `details`. That's the existing behavior.
- `readFormDataText` throws `apiError('VALIDATION_FAILED', <sentence>)` directly. Its existing empty check already says "Please write a caption.".
- **My call:** the caption, comment and username inputs on the client get a matching `maxlength` attribute, so the limit is hard to hit from the UI.

### Atomic reset requests and reset links

- **`sentToken`** replaces its `deleteMany` + `save` with one `findOneAndUpdate({ userId }, { token: digest, createdAt: new Date() }, { upsert: true })`. Setting `createdAt` restarts the hour on the TTL index. With the unique `userId` index, MongoDB retries an upsert that collides on that key, so two concurrent requests leave one token. Only the last email's link works.
- **`resetPasswordWithToken`** consumes the token first, with `findOneAndDelete({ userId, token: digest })`, then updates the password. A second use at the same moment finds nothing and gets the existing "This reset link is invalid or has expired."
- The comment above the reset-link origin also says that it trusts the `Host` header. Vercel sets that header to the domain that was reached. Behind any other proxy, check first that `Host` can't be spoofed.

### `.lean()` reads, only where they can't drop a field

Lean results skip schema defaults. A second `check-db` run on 2026-11-21 found production records missing defaulted fields:

- 7 users have no `role`;
- 8 users have no `updatedAt`;
- 150 posts have no `updatedAt`.

A hydrated document fills these in, and a lean one would leave them out. The admin users page and the admin checks read `role`.

**The owner chose not to backfill.** So a read uses `.lean()` only when what it returns contains no field with a schema default, including populated paths.

- **Today that's the trimmed post list**, which returns only `_id` and `imageId`.
- **These stay hydrated:**
  - the user loader and the user list (`role`, `updatedAt`);
  - the post list (`updatedAt`);
  - the comment lists, whose populated `post` selects `updatedAt`.
- Queries whose documents get `.save()`d or `.deleteOne()`d stay as they are too.

Since no schema enables `toJSON` virtuals, a safe lean read serializes to the same JSON.

### Narrower types

In `shared/types/model-dto.types.ts`:

- `PostType.author` and `CommentType.author` become `Pick<UserType, '_id' | 'name'>`, which is what `populate` selects.
- `CommentType.post` becomes `Pick<PostType, '_id' | 'date' | 'updatedAt'> | null`, because a comment's post can be gone (the production comment above).

The client reads only `author._id` and `author.name`, and never `comment.post`, so it should typecheck unchanged.

### Fewer dangling comments

**My call:** `createNewComment` checks that the post exists, and answers 404 `NOT_FOUND` "Post not found" if it doesn't. The existing dangling comment stays until the owner deletes it from the admin area. The admin comment list doesn't read `comment.post`.

### The three 2a minors

- **Malformed JSON body.** H3's `readBody` throws a 400 whose `statusMessage` is the bare reason phrase "Bad Request". `toApiFailure` answers an H3 4xx that carries only its default reason phrase with "The request could not be read." under the status's code. An H3 4xx with a real sentence keeps it, as today.
- **A handler that returns `undefined`.** `defineApiRoute` answers `{ ok: true, data: data ?? null }`.
- **A failed Cloudinary delete.** `deleteCloudinaryImage` turns a thrown error into `apiError('UPSTREAM_FAILED', 'Could not delete the image, please try again.')`. **My call:** `deletePostById` deletes the image _first_, then the comments, then the post, so a Cloudinary failure leaves the post and its comments intact. Today it would have deleted the comments already. A `{ result: 'not found' }` from Cloudinary counts as success, so a post whose image is already gone can still be deleted.

### `scripts/check-db.ts`

This is the read-only check the owner already ran, committed as is. It covers duplicates that would block a unique index, text lengths, fields missing their schema default, and dangling references. It prints ids, counts and lengths, never emails or names. CLAUDE.md's command table gets a row: `node --env-file=<env file> scripts/check-db.ts`.

## Deploy checklist (goes in the PR description)

Vercel preview deploys use the dev database (`.env.dev`, database `manguito-page-test`). The owner ran `check-db` there on 2026-11-21 and got "No blockers", so the preview builds the indexes there first.

1. After the preview deploy has served a request, the owner runs `node --env-file=.env.dev scripts/check-db.ts`. The index list shows `name` unique, `date`, `post` and `userId` unique.
2. Before merging, the owner renames user `611f4b8b79f31c0016a092e6` in production so no two names match. Then `node --env-file=.env scripts/check-db.ts` reports "No blockers".
3. Merge, and let Vercel deploy.
4. After production has served a request, the owner runs the production check again and sees the same index list.

## Testing

All behavior is covered in the existing `api` and `unit` Vitest projects, with no network.

- **API tests** cover:
  - a request loads its user once (count `User` queries per request in some way that doesn't touch production code paths, e.g. Mongoose debug or a query hook in the test);
  - an old-format token (no `v`) still works;
  - a token from before a reset gets 401 while the new login works;
  - a settings password change keeps other tokens alive;
  - mixed-case email at signup, login and reset;
  - each length limit and its message;
  - concurrent reset requests leave one token;
  - a reset link can't be used twice;
  - a comment on a missing post gets 404;
  - malformed JSON;
  - a `null` handler result;
  - a Cloudinary delete failure via `failNext('cloudinary')`, leaving the post and comments intact;
  - the new indexes exist after startup (`listIndexes` on the memory DB).
- **Unit tests** cover the `toApiFailure` reason-phrase case.
- Existing tests keep passing, which shows the response shapes are unchanged.

## Left to the builder

- How the loader is stored on `event.context`, and its typing (`H3EventContext` augmentation).
- The exact Zod chains (`z.string().trim().min().max()`, and email preprocessing).
- How tests count user queries.
- Whether `UserController.signToken` moves to a util.
- Which client components hold the caption, comment and username inputs that get `maxlength`.
- Whether `PopulatedPostModel` (unused) and the commented-out `PopulatedCommentModel` are deleted. Deleting them is fine.
