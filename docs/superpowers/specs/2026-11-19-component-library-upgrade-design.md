# Component library upgrade: design

Issue: #12. Size: small change.

## Intent

Move the five `@bobbykim/*` packages to their latest releases and fix what breaks, so the site stays current with the library the owner maintains and picks up its 1.x accessibility work (keyboard focus ring, reduced motion, Escape closing Modal/Sidebar with focus returned). Pages must look and work the same as production.

## Goals

- `@bobbykim/manguito-theme` 0.28.2 → 1.6.0, `mcl-cards` 0.9.2 → 0.10.9, `mcl-container` 0.8.8 → 0.9.8, `mcl-footer` 0.9.8 → 0.10.9, `mcl-forms` 0.9.9 → 0.13.0.
- Every breaking change from the library's `docs/mcl-82/migration-guide-v1.md` and CHANGELOGs resolved where this app uses it:
  - `class-name` → `custom-class` on `Modal` (`pages/posts/index.vue`, `pages/admin/users.vue`) and `Collapse` (`components/layout-components/UpdateUserInfo.vue`).
  - `MclInputFile`: `is-required` → `required`, `display-border` → `show-border`; any other `display-*` in `pages/posts/index.vue` → `show-*`.
  - Sidebar's Update username / Update password panels: `v-collapse` + `accordion` (no longer work) → `<AccordionGroup>` with `useCollapseTrigger` on each trigger button, so the buttons toggle their panel, only one is open at a time, and each button carries `aria-expanded` / `aria-controls`.
  - Hover fades: `hover:bg-opacity-*` only affects the library's renamed `mcl-bg-*` utilities in 1.x. Replace with Tailwind's slash form on the same color, e.g. `bg-primary … hover:bg-primary/70`, `bg-light-3 … hover:bg-light-3/60`, `bg-dark-3 … hover:bg-dark-3/75` (5 places: `UpdateUserInfo.vue` ×2, `about.vue`, `posts/index.vue` ×2).
- Deprecated-but-present APIs replaced too (owner's decision): the new-post button's `v-toggle:new-post-modal` (reported not working) → `@click="modalRef?.open()"`.

## Non-goals

- Other dependency bumps (#13), including `@vueuse/core`. If pnpm warns that the mcl packages want `@vueuse/core` ^12 while the app has 14, leave it unless something actually breaks; say so in the PR.
- New accessibility props the 1.x components offer (`ariaLabel`, `navLabel`, `dismissLabel`, …) beyond what the rewritten code above needs. That's #14.
- Any change in how the site looks, apart from fixes that make it match production again.

## Anti-goals

- A visual regression against production that the PR doesn't call out.
- Old prop names left in place. Vue passes unknown props through without an error, and typecheck doesn't flag them, so they fail silently.
- `btn-no-ring` or other CSS used to hide the new keyboard focus ring.

## Constraints

- Every mcl package at latest requires `@bobbykim/manguito-theme` at exactly 1.6.0, so all five move in one PR.
- pnpm 12's minimum release age may block a just-published version; if it does, add a `minimumReleaseAgeExclude` entry for `@bobbykim/*` (as mango-planner-v2 has).
- The theme stops overriding every `bg-*` class, so Tailwind's own utilities start working as written. Known instance: `lg:bg-transparent` in `components/layout-components/AuthBlock.vue`. Check it against production. If it now looks different, keep production's look and say how in the PR.

## Approaches

How to upgrade: one way. The pinned theme peer makes package-by-package PRs impossible. One PR, one commit per kind of fix.

How to prove no visual regressions (owner picked 1):

|                | Approach                                                                                                                                                                                                                                                                                                                          | Trade-off                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **1 (picked)** | Page/unit tests for what fails silently (Modal gets its custom class, file input is `required`, sidebar panels render inside an accordion with `aria-expanded`, the new-post button opens the modal), plus a manual walkthrough of every page in `pnpm dev`, logged out, as a user and as an admin, side by side with production. | The visual part rests on a human walkthrough.                                                                                     |
| 2              | Playwright screenshot diffs against production.                                                                                                                                                                                                                                                                                   | Production and the local DB hold different data, so most diffs would be noise; adds a browser toolchain the project doesn't have. |

## Left to the builder

- Whether each silent-failure test is a page test (`test/pages/`, real SSR HTML) or a unit test (`test/unit/`, mounted component). Prefer page tests where the markup is server-rendered. The Modal and Sidebar only render after login or a click, so those likely need component tests.
- The exact hover-opacity value for each button (keep today's number).
- Commit split and order.

## Done when

- All five packages on latest; `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` pass locally and in CI.
- No old prop names remain under `app/` (grep for `class-name`, `is-required`, `display-`, `v-collapse`, `v-toggle`, `accordion=`, `bg-opacity`).
- Manual walkthrough done and written up in the PR: home, posts grid, post page, about, login/signup/request/reset, admin pages, sidebar panels, new-post modal, user-role modal, alerts, keyboard focus on buttons. Any difference from production is listed.
- Vercel preview checked by the owner.
- `CLAUDE.md` updated if a convention changed (e.g. "open Modal/Sidebar through the template ref, not `v-toggle`").
