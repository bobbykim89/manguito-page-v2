# Dependency bumps: design

Issue: #13. Size: small change. Owner approved the proposal below and said to go ahead without a separate design review.

## Intent

Keep the site's dependencies current and patched after the component library upgrade (#12), remove unused ones, and keep the site working the same.

## Decisions

- Every non-`@bobbykim` dependency and devDependency goes to its latest version, except:
  - **TypeScript → 6.0.x, not 7.0.** 7.0 is the native (Go) compiler and `vue-tsc` / `nuxt typecheck` depend on the JS compiler API. Revisit when `vue-tsc` supports 7.
  - **`@types/node` → 24.x, not 26.** The runtime is Node 24 (`.nvmrc`, `engines`), so types should not offer newer APIs.
- Remove unused: `sass` (no SCSS in the app), `vue-router` as a direct dependency (Nuxt provides it; nothing imports it), `@types/bcryptjs` (deprecated; bcryptjs 3 ships types).
- Keep the `isomorphic-dompurify>jsdom: 25.0.1` override from #12 unless the newer stack makes it unnecessary (the SSR page tests decide).

## Approach (owner-approved: one PR)

One PR, one commit per group, the full check (`lint`, `format:check`, `typecheck`, `test`) green after each, so one group can be reverted alone:

1. Remove unused packages.
2. Patch/minor bumps within current majors (Vue, Mongoose, Zod, Tailwind, Cloudinary, `@nuxt/image`, test tooling, …).
3. Nuxt 4.6 + Vite 8 (Rolldown) + `@vite-pwa/nuxt` 2 + `@nuxtjs/robots` 7 (they require each other).
4. Pinia 4 + `@pinia/nuxt` 1.
5. nodemailer 10 + `@types/nodemailer` 8.
6. `@nuxt/fonts` 1.
7. `@vueuse/core` 15.
8. TypeScript 6.0 + `@types/node` 24.

Considered: one PR per group. More review rounds for the owner and the Nuxt/Vite/PWA/robots group can't be split anyway; per-group commits give the same revert granularity.

## Anti-goals

- A dependency that `require()`s ESM-only code at runtime (Vercel runs without require(esm); the SSR page tests run the same way).
- Lint rules relaxed, tests skipped, or `@ts-ignore` added to get to green.
- Behaviour changes hidden in a bump commit: a code change a bump needs goes in that group's commit and is named in its message.

## Done when

- Checks green after every group, locally and in CI.
- Smoke test: the screenshot walkthrough from #12 (master vs branch on identical seeded data) shows no unexplained differences: browse, post page, comment, login, sidebar panels, admin pages, modals.
- Owner checks on the Vercel preview what can't run here without real credentials: creating, editing and deleting a post (Cloudinary) and the password-reset email (Gmail).
- `CLAUDE.md` updated if a convention or command changed.
