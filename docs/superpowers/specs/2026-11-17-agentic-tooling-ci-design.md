# Agentic tooling, Node 24, and PR CI — design

Issue: #11

## Intent

Bring manguito-page-v2 up to the working setup of `mango-planner-v2`, so that:

- coding agents (Claude Code) have the project context and guardrails they need, and
- every pull request to `master` is linted, type-checked and tested before it can merge.

This is the foundation for the rest of the backlog (#22, #12, #13, #15, #16, …). In particular, #22 needs an API-level regression test and #15 rewrites every API route, so the API test harness must exist before they start.

## Goals

1. `CLAUDE.md` describing this project as it is **today**: stack, commands, layout, conventions, guardrails.
2. `.claude/settings.json` with the same allow/deny lists as mango-planner-v2 (including the `.env` read/edit denials).
3. Node 24: `.nvmrc` = `24`, `engines.node` = `>=24.0.0`.
4. pnpm: `packageManager` pinned to the latest pnpm 12 release (12.21.0 at time of writing) with its sha512, via corepack. `pnpm-workspace.yaml` with `allowBuilds` for every dependency that needs an install script.
5. ESLint (flat config, same rules as mango-planner-v2) with all existing violations fixed.
6. Prettier with `prettier-plugin-tailwindcss`, same `.prettierrc` as mango-planner-v2, applied to the whole codebase.
7. Vitest with two projects, mirroring mango-planner-v2:
   - `api`: builds the app with fake values, runs it against `mongodb-memory-server`, tests call real routes and render real pages.
   - `unit`: Nuxt environment (happy-dom) for stores and composables, API mocked.
   - Starter tests that prove both projects work.
8. `typecheck`, `lint`, `format`, `format:check`, `test`, `test:watch` scripts.
9. `.github/workflows/ci.yml` with `lint` and `test` jobs on every PR and on pushes to `master`.
10. Branch protection on `master` matching mango-planner-v2.
11. README: new domain (https://manguito-page.bobbykim.dev/), Node/pnpm requirements, new commands.

## Non-goals

- Bumping existing runtime dependencies (that's #13) or the `@bobbykim/*` libraries (#12). Exception: if a new dev tool (e.g. `@nuxt/test-utils`) refuses to work with the current Nuxt version, bump the minimum needed and say so in the PR.
- Fixing bugs or refactoring app code. The only production code changes allowed are the lint fixes, the Prettier reformat, and the DB connection override below.
- Real test coverage. Tests beyond the starter set arrive with each later issue.
- Changing response shapes, error handling or auth (#15, #16, #22).

## Anti-goals (would make this a failure even if CI is green)

- Any change in how the deployed site behaves on Vercel.
- Tests that load the developer's real `.env` / `.env.*` or touch production MongoDB, Cloudinary, or Gmail.
- `CLAUDE.md` describing conventions the code doesn't follow yet (e.g. the `{ ok, data }` envelopes planned in #15). It must describe what's true now; later issues update it.
- Lint rules relaxed or disabled to get to green.
- A formatting diff mixed into a commit that also changes behaviour.

## Approaches considered

|                | Approach                                                                                                                  | Trade-off                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **A (picked)** | Full mango-planner-v2 test harness now: `api` project (build + in-memory MongoDB) and `unit` project, with starter tests. | Bigger #11, CI a few minutes slower per run. The next two issues (#22, #15) need API tests, so the harness exists before they land. |
| B              | Unit project + one smoke test now; build the API harness inside #22.                                                      | Smaller #11, but #22 grows and becomes a harness project as well as a bug fix.                                                      |

Picked A for the reason above.

How Vercel picks pnpm 12:

|                | Approach                                                                        | Trade-off                                                                 |
| -------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **A (picked)** | `ENABLE_EXPERIMENTAL_COREPACK=1` in Vercel project settings.                    | One-time dashboard step; the pnpm version lives only in `package.json`.   |
| B              | `vercel.json` with `installCommand: "npx pnpm@12.x install --frozen-lockfile"`. | In the repo and reviewable, but the pnpm version is pinned in two places. |

Lint scope was settled from data: mango-planner-v2's ESLint config reports 13 problems in 9 files (7 `no-unused-vars`, 2 `no-non-null-asserted-optional-chain`, 1 each of `no-unused-expressions`, `no-explicit-any`, `prefer-const`, `no-empty-object-type`). `nuxt typecheck` already passes. So all violations get fixed and nothing is relaxed.

## Design

### Reference

Copy from `/mnt/projects/mango-planner-v2` and adapt; don't invent:

| This repo                                                                               | Source in mango-planner-v2                                                                      |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `CLAUDE.md`                                                                             | `CLAUDE.md` (structure and tone; content rewritten for this app)                                |
| `.claude/settings.json`                                                                 | `.claude/settings.json` (verbatim)                                                              |
| `eslint.config.mjs`                                                                     | `eslint.config.mjs` (verbatim; drop ignores for dirs that don't exist only if ESLint complains) |
| `.prettierrc`, `.prettierignore`                                                        | same files; `tailwindStylesheet` pointed at this repo's main CSS file                           |
| `vitest.config.ts`                                                                      | `vitest.config.ts`                                                                              |
| `test/setup/global.ts`, `test/utils/api.ts`, `test/utils/db.ts`, `test/unit/helpers.ts` | same paths, trimmed to what this app needs                                                      |
| `.github/workflows/ci.yml`                                                              | `.github/workflows/ci.yml` (verbatim, including its comments)                                   |
| `.git-blame-ignore-revs`                                                                | same file format                                                                                |

### Database connection override (production code change)

`server/plugins/connectDb.ts` builds the Mongo URL from `mongoId`, `mongoPw`, `mongoClusterName`, `mongoUrl`, `mongoDBName`, branching on `workBranch === 'LOCAL'`. There's no way to point it at the in-memory server.

Add an optional `mongoUri` key to `runtimeConfig` (empty by default, so set at runtime by `NUXT_MONGO_URI`). In `setMongoUrl`, if `mongoUri` is non-empty, return it; otherwise behave exactly as today. Nothing in Vercel or local `.env` files changes.

### Test harness specifics for this app

- `test/test.env`: fake, non-secret values for every key `nuxt.config.ts` reads (`WORK_BRANCH`, `MONGO_*`, `JWT_SECRET`, `ADMIN_SECRET_PHRASE`, `CLOUDINARY_*`, `MAILER_*`). Committed. Must not match the `.env.*` gitignore pattern (the name `test/test.env` doesn't).
- `global.ts` sets `NUXT_MONGO_URI` to the memory server and `NUXT_JWT_SECRET` to a test value. Keep `--no-experimental-require-module` (mirrors Vercel's runtime). Keep `SKIP_BUILD=1`.
- Cloudinary config with fake values is harmless at startup. No starter test uploads or sends email, so no Cloudinary or mailer stubbing yet. #17 and #22 add stubs when they need them.
- `test/.tmp/` (server log) is gitignored.

### Starter tests

- `test/api/smoke.test.ts`: unknown `/api/...` route returns 404; the memory DB is reachable.
- `test/api/post.test.ts`: `GET /api/post` on an empty DB returns 200 and an empty list (proves a real route plus Mongoose against the memory DB).
- `test/pages/ssr.test.ts`: `GET /` returns 200 HTML.
- `test/unit/alertStore.test.ts`: `setAlert` updates state (proves the Nuxt unit environment).

### Commit sequence (one PR)

1. Tooling config: Node, pnpm, workspace, ESLint, Prettier, scripts, `.claude/settings.json`.
2. Lint fixes only.
3. `style(*): format the codebase with Prettier`: formatting only, no other changes.
4. Add commit 3's hash to `.git-blame-ignore-revs`. This works because the owner reviews and merges PRs themselves with merge commits, which keep the hash. The PR description must say "merge with a merge commit, don't squash or rebase", and the branch must not be rebased after commit 4.
5. DB connection override + test harness + starter tests.
6. CI workflow.
7. `CLAUDE.md` + README.

Commit messages follow the repo's existing Conventional Commits style with a scope, e.g. `feat(test/): ...`, `chore(.github/): ...`.

### Branch protection

Matches mango-planner-v2 exactly:

- Pull requests required, 0 approvals.
- Required status checks: `test`, `lint` (not strict, so branches needn't be up to date).
- Admins not enforced; force pushes and deletions disallowed.

Apply it with `gh api` **after** the PR's CI run shows both checks passing and **before** merging. That way the PR itself is the first one gated, and the required check names are known to exist.

### CLAUDE.md content

Same sections as mango-planner-v2 (intro, Toolchain, Commands, Tests, Layout, Conventions, Guardrails), describing this app now:

- Photo blog for Manguito; Nuxt 4 + Nitro + MongoDB/Mongoose, Cloudinary images, Nodemailer, Pinia; deployed at https://manguito-page.bobbykim.dev/ via Vercel.
- Current focus: the backlog #11–#22.
- Local DB via `pnpm db:local:restart` (Docker; wipes data).
- Conventions as the code has them today: thin API routes plus class-based controller singletons, Zod DTOs in `shared/`, `createError` errors, cookie + `Authorization` header auth, stores initialised in `init.plugin.ts`.
- Guardrails copied from mango-planner-v2: no `.env` access, careful with `:prod` scripts, protected `master`, Conventional Commits with scope.

## Constraints

- Node 24 locally (v24.22.1 installed) and in CI via `.nvmrc`.
- Vercel picks the Node version from `engines`. Check after deploy that the Vercel project's Node setting isn't pinned to an older version. That's a dashboard check for the owner.
- pnpm 12 fails installs on unapproved build scripts. Every one goes into `allowBuilds`.
- **Vercel must use the pnpm in `packageManager`.** Without instructions, Vercel guesses the pnpm version from the lockfile and may pick an older pnpm that ignores `allowBuilds`. Decision: the owner sets the environment variable `ENABLE_EXPERIMENTAL_COREPACK=1` in the Vercel project (all environments, Preview included) before the PR's preview build is checked. Despite the name, it's Vercel's documented switch for honouring `packageManager`. pnpm itself stays on the stable 12.x release. No `vercel.json` and no custom Install Command. The PR description lists this as an owner step, and the preview build log must show pnpm 12.
- pnpm 12 enforces a minimum package release age. It won't matter here, but #12 may need `minimumReleaseAgeExclude` as mango-planner-v2 has.

## Left to the builder

- Exact versions of new dev dependencies (latest compatible with Nuxt 4.3 / Vite 7 / Node 24).
- Which packages need `allowBuilds` (discover from the install).
- How to fix each of the 13 lint problems, as long as behaviour doesn't change.
- Wording of `CLAUDE.md` and README.

## Done when

- `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` all pass locally on Node 24 and in CI.
- `pnpm dev` and `pnpm build:local` still work; the site behaves as before.
- PR shows `lint` and `test` checks; `master` requires them.
- The PR's Vercel preview deployment builds with pnpm 12 (check the build log) and the site works on it: browse posts, open a post, log in. This is the proof that production won't change; the PR isn't ready to merge without it.
- Issue #11's checklist is ticked.
