# Manguito Page v2

Photo blog for Manguito, a peach-faced lovebird. Nuxt 4 (Vue 3) frontend and a Nitro/H3 API in one repo, with MongoDB via Mongoose. Images are hosted on Cloudinary, password-reset emails go out through Nodemailer (Gmail), and client state lives in Pinia. Features: a photo grid and post pages with comments, JWT auth with signup, login and email password reset, and an admin area (posts, comments, users, access requests). Installable PWA. Deployed on Vercel (https://manguito-page.bobbykim.dev/).

Current focus: the improvement backlog in GitHub issues #11–#22 (tooling, component-library upgrade, dependency bumps, backend refactor, stores refactor, infinite scroll, image uploads, hydration, accessibility, About page, dashboard). Prefer small, verifiable changes over sweeping rewrites. When an issue changes a convention below (e.g. #15 response envelopes, #16 stores), update this file in the same PR.

## Toolchain

- Node **24** (`.nvmrc`; run `nvm use` first). `engines.node` is `>=24.0.0`.
- pnpm **12** pinned via `packageManager` (use corepack). Build scripts must be explicitly allowed in `pnpm-workspace.yaml` under `allowBuilds`; pnpm 12 fails the install on unapproved ones.
- Vercel uses the pinned pnpm because the project sets `ENABLE_EXPERIMENTAL_COREPACK=1`.
- Held back on purpose: TypeScript stays on 6.0 (7.0 is the native compiler, which `vue-tsc` doesn't support yet) and `@types/node` on 24 (the runtime is Node 24). Tailwind 4 runs through its Vite plugin (`@tailwindcss/vite` in `nuxt.config.ts`), not PostCSS.

## Commands

| Command                                   | What it does                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                            | Install deps (runs `nuxt prepare` to generate `.nuxt/` types)                                                     |
| `pnpm db:local:up`                        | Start the local MongoDB in Docker (port 8080)                                                                     |
| `pnpm db:local:restart`                   | Recreate the local MongoDB container; **wipes its data**                                                          |
| `pnpm dev`                                | Dev server on :3000 using `.env.local` (needs the local DB)                                                       |
| `pnpm dev:dev` / `pnpm dev:prod`          | Dev server using `.env.dev` / `.env` (remote databases, so use with care)                                         |
| `pnpm build:local`                        | Production build with `.env.local`                                                                                |
| `pnpm build` / `build:dev` / `build:prod` | Production builds with real credentials; Vercel runs `build`                                                      |
| `pnpm preview`                            | Serve the production build                                                                                        |
| `pnpm typecheck`                          | `nuxt typecheck` (vue-tsc across the app/server/shared project references)                                        |
| `pnpm lint`                               | ESLint (`eslint.config.mjs`: recommended JS/TS rules + Vue essentials, same base as MCL)                          |
| `pnpm format` / `pnpm format:check`       | Prettier write / check (`.prettierrc`, sorts Tailwind classes)                                                    |
| `pnpm test`                               | All Vitest tests: the `api` project (builds the app, runs it against an in-memory MongoDB) and the `unit` project |
| `pnpm vitest run --project unit`          | Only the fast client unit tests (no build)                                                                        |
| `pnpm test:watch`                         | Vitest in watch mode                                                                                              |

**Tests:** Vitest runs two projects (`vitest.config.ts`):

- `api`: `test/api/` and `test/pages/`. The global setup (`test/setup/global.ts`) builds the app with the fake values in `test/test.env` (never the real `.env`), starts it against `mongodb-memory-server` (via `NUXT_MONGO_URI`, see `server/utils/mongoUrl.util.ts`) with require-of-ESM disabled (like Vercel), and the tests call the real `/api` routes (`test/utils/api.ts`) and render real pages. `test/utils/db.ts` connects to the same memory DB for setup and assertions. Set `SKIP_BUILD=1` to reuse an existing `.output` when only tests changed.
- `unit`: `test/unit/`, client stores, composables and pure server helpers in the Nuxt environment (happy-dom), loading `test/test.env`. Call `resetState()` from `test/unit/helpers.ts` in `beforeEach`; mock API routes with `mockApi(method, url, handler)` and remove them with `clearApiMocks()` in `afterEach`.

CI (`.github/workflows/ci.yml`) runs two jobs on every PR: `lint` (`pnpm lint`, `pnpm format:check`) and `test` (`pnpm typecheck`, `pnpm test`). Both are required checks on `master`. Run `pnpm lint` and `pnpm format` before committing; also exercise UI changes in `pnpm dev`.

## Layout

```
app/        Nuxt app (srcDir): pages (incl. admin/, auth/, posts/), components/{home,layout-components,posts},
            layouts (default, admin), stores (Pinia), composables, middleware (authRoute, adminRoute, guestRoute), plugins
server/     Nitro: api/ (file-based routes), controller/ (business logic), utils/ (auto-imported), plugins/connectDb.ts
shared/     Code used by both sides (#shared alias): models/ (Mongoose), dto/ (Zod schemas), types/
test/       Vitest: api/, pages/, unit/, setup/, utils/, test.env (fake values)
public/     Images and PWA icons
docs/       superpowers/specs (designs) and superpowers/plans (implementation plans)
```

## Conventions

- **API routes are thin.** Each `server/api/**/<name>.<method>.ts` only wires middleware and a controller method:
  ```ts
  export default defineEventHandler({
    onRequest: [defineRequestMiddleware(checkAuth)],
    handler: eventHandler(postController.updatePost),
  })
  ```
  Logic lives in class-based controllers (`server/controller/<domain>/<domain>.controller.ts`), exported as singletons from `server/controller/index.ts`. Multipart uploads run `uploadCloudinary` and `readFormDataText` as request middleware before the handler.
- **Validation:** request bodies go through Zod schemas in `shared/dto/<domain>/` via `readValidatedBody(e, schema.parse)`.
- **Errors:** throw `createError({ status, message, statusMessage })`. The client surfaces `statusMessage` to users (`useErrorCheck().extractMessage`) and treats `statusCode === 401` as an auth failure (`isAuthError`). Responses are the raw resource, not an envelope (#15 changes this). `app/error.vue` shows the real status: 404 says the page doesn't exist, other 4xx show `statusMessage`, 5xx show a generic message (never server internals).
- **Auth:** `POST /api/auth` returns `access_token: "Bearer <jwt>"`. The client stores it in the `access_token` cookie (`useAuthToken`, 7 days) and sends it verbatim as the `Authorization` header. `server/utils/checkAuth.util.ts` verifies it and sets `event.context.user`. A valid token whose user no longer exists gets **401** `Session expired, please log in again` (not 404). `useAuthToken` returns one shared cookie ref per app instance. Roles are `ADMIN`, `MANAGER`, `USER`; role checks live in each controller method.
- **Client state:** Pinia setup stores in `app/stores/` (`alertStore`, `postStore`, `userStore`, `initStore`). `app/plugins/init.plugin.ts` calls `initStore.initStores()` on `app:created`, which loads all posts and runs `userStore.ensureAuth()` (the current-user check, at most once per app instance). A 401 from `userStore` logs out (cookie and auth state cleared, `sessionExpired` set): **quietly** for the startup check, with the 401 message for actions the user started. Other errors alert as before. A 401 from `postStore` or page fetches only alerts (the server still uses 401 for some permission errors; #15 splits 401/403). The route guards (`adminRoute`, `authRoute`, `guestRoute`) `await userStore.ensureAuth()` first, so they also run during the server render; on a protected page an expired session goes to `/auth/login?reason=expired` (the login page explains it), no session goes to `/` (the guard's alert shows only on client-side navigation; on a first-load 302 it's lost). (#16 refactors the stores.)
- **Component library** (`@bobbykim/manguito-theme` 1.x, `mcl-*`): open `Modal`/`Sidebar` through their template ref (`open()`/`close()`), and build collapsibles from `Collapse` in an `<AccordionGroup>` with `useCollapseTrigger` (from `@bobbykim/manguito-theme/composable`) on the trigger button. `v-toggle`/`v-collapse` don't work. Use the 1.x prop names (`custom-class`, `show-*`, `MclFormGroup`'s `field-id`); Vue passes unknown props through silently, so `test/unit/libraryMigration.test.ts` bans the old ones. Show form errors by binding `:invalid` (with `invalid-feedback`); native validity no longer shows them. The theme's background utility is `mcl-bg-*`, so fade a color with Tailwind's `bg-<color>/<opacity>`, not `bg-opacity-*`. The theme's spacing tokens (`--spacing-xs` … `--spacing-3xl`) also win over Tailwind's container sizes, so `max-w-md` is 2rem, not 28rem: write the width out (`max-w-[28rem]`). `isomorphic-dompurify`'s jsdom is pinned to 25 in `pnpm-workspace.yaml` because newer jsdom breaks SSR on Vercel; keep the pin.
- **Browser-only APIs** (window, image compression) are guarded with `import.meta.client` or `<ClientOnly>` to avoid SSR/hydration errors.
- **Style:** Prettier (single quotes, no semicolons, 2-space indent, Tailwind classes sorted by `prettier-plugin-tailwindcss`), checked in CI. TypeScript strict. A deliberately unused binding starts with `_`. Match the surrounding code.

## Guardrails

- Do **not** read, print, or edit `.env` / `.env.*`. If you need to know which variables exist, look at `runtimeConfig` in `nuxt.config.ts`; `test/test.env` lists them with fake values.
- `pnpm dev:dev`, `dev:prod`, `build`, `build:dev` and `build:prod` point at remote services with real data. Don't run anything that writes data against them without asking. Use `pnpm dev` / `build:local` with the local DB.
- `master` is protected: work on a branch and open a PR; `lint` and `test` must pass. PRs are merged with merge commits (keeps `.git-blame-ignore-revs` hashes valid). Commit messages follow Conventional Commits with a path scope, e.g. `fix(server/controller/): ...`, `feat(app/stores/): ...`.
