# Security fixes (issue #15, part 1)

## Why

Reading the server for #15 turned up security holes that are live on production, plus a bug that stops authors from editing their posts. They ship first, in a small PR. The `{ ok, data }` envelope and the performance work follow in a second PR.

## Goals

1. **The password-reset link can't be pointed at another site.** Today the link's base URL comes from the request body.
2. **Reset tokens are unguessable, and the database never holds a usable token.** Today the token comes from `Math.random()`, and the stored bcrypt hash is the secret sent in the link.
3. **A reset request doesn't reveal whether an email has an account.**
4. **Authors can edit their own posts, and delete their own posts and comments.** Today the ownership checks compare ObjectIds with `!==`, which is always true.
5. **A refused new-post request never uploads to Cloudinary.** Today the upload middleware runs before the role check.
6. **Public post and comment responses expose only the author's `_id` and `name`.** Today posts include the author's email.
7. **The role check accepts exactly `MANAGER` or `USER`.** Today the regex is unanchored.

## Non-goals

- Response envelopes, 401 vs 403, 400 for invalid ids, length limits and indexes. Those belong to part 2.
- Rate limiting.
- Any change to who may do what. Admins and managers keep their current powers.

## Approaches: reset link base URL

- **A. The request's own origin** (`getRequestURL(e).origin` on the server). Vercel only routes the domains attached to the project, so an attacker can't set it to their own site. Previews link to themselves, and there's no new config. It depends on the host routing by domain.
- **B. A fixed `NUXT_SITE_URL` setting.** It doesn't depend on the host. It's one more Vercel variable, and preview emails would link to production.

**Chosen: A** (owner's decision). It's safe on Vercel, needs no configuration, and the reset email can be checked on the PR preview.

## Design

### Password reset

- `POST /api/token/send-token` takes `{ email }`. The `url` field is removed from the schema and from `app/pages/auth/request.vue`.
- The server builds the link from the request origin: `${origin}/auth/reset-password?user=<id>&token=<token>`.
- **Token:**
  - The token is 32 random bytes from `node:crypto`, hex-encoded, and goes only in the email.
  - The database stores its SHA-256 hex digest. A fast hash is fine for a 256-bit random value, and it allows a direct `findOne({ userId, token: digest })`.
  - A new request deletes the user's existing token before creating one.
  - The token is deleted after a successful reset. The existing one-hour TTL stays.
  - Tokens issued before the deploy stop working, which is acceptable within the hour.
- **Response:** the same 200 response whether or not the account exists. The request page's alert becomes "If that email has an account, we've sent a reset link."
  - If Gmail fails, the 500 "Failed to send email" stays. It's rare, and it tells a real user to retry. (My call.)

### Ownership checks

- Post update and post delete, plus comment delete, compare ids with `.equals()` (or by string).
- **Post update:** author only, as intended.
- **Post delete:** the author or an admin.
- **Comment delete:** the author, an admin or a manager.
- The client already compares string ids correctly, so it doesn't change.

### Upload order

- A new request middleware runs before `uploadCloudinary` on `POST /api/post` and rejects anyone who isn't `ADMIN` or `MANAGER`. It's a `requireRole` util in `server/utils/` that reads `event.context.user`.
- The controller keeps its own role check as defence in depth.

### Author fields

- Every post `populate('author', ...)` selects `name` only (`_id` always comes along).
- Comments already select `id name`.

### Role schema

- `setUserRoleInputSchema` uses `z.enum(['MANAGER', 'USER'])`.

## Testing

Each fix starts as a failing API test against the real routes. Reset emails need a seam:

- `sendEmail` reads the SMTP host, port and secure flag from `runtimeConfig`. The defaults are today's Gmail values, so production doesn't change. `service: 'Gmail'` is dropped in favour of the explicit host.
- The API test setup starts a local SMTP sink and points the server at it with `NUXT_MAILER_*` variables. The tests then read the real email and check:
  - the link's origin;
  - that the token works once;
  - that the stored value isn't the token.

## Left to the builder

- The SMTP sink library (`smtp-server` or a small hand-rolled one).
- Test file layout.
- Commit grouping.
