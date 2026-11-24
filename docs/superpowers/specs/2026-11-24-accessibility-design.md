# Accessibility pass to WCAG 2.0 AA (#14) — design

## Why

The goal is that everyone can use the site: by keyboard only, with a screen reader, with low vision, or with a system that asks for less motion. It should meet WCAG 2.0 AA, as the issue says, and stay there after this pass. An earlier fix landed in #10, but no full audit has been done until now. The About page gets its own check in #20, which rewrites it (owner's decision to do #14 first).

## What the audit found

**Method:**

- An automated check (axe-core, WCAG 2.0 A/AA plus best practices) on every page: 14 pages, logged out / USER / ADMIN, at 1200 px and 390 px, so 84 loads. It ran against `pnpm dev` on the local DB with seeded posts and comments.
- A keyboard walk on Home and `/posts`.
- The open states, also checked with axe: the mobile menu, the account sidebar and the new-post window.
- Reading the code for what neither can see. A builder review found items 2, 10 and 11 this way.

Every one of the 84 loads had at least one failure.

| #   | Where                                                 | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | WCAG                |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | Every page                                            | **Colour contrast** (4.5:1 needed for normal text, 3:1 for large): <br>• pink `#ec489a` text on `#fafafa` is 3.4; on `#e8e8e8` (login links) 2.9 <br>• white on pink is 3.5 (Home hero) <br>• `light-3` text on pink buttons is 2.9 (auth forms, error page) <br>• white on the green success alert is 2.2 <br>• `dark-1` grey `#747474` text on `#fafafa` is 4.47 ("That's every photo"); on `light-4` `#d0d0d0` it's 3.0 (comment author and date) <br>• white on the `warning` Cancel button fails too | 1.4.3               |
| 2   | Home photo tiles                                      | `MclCardC` flip cards are clickable `<div>`s with no tabindex or role. Keyboard users can't reach or open them: the first click flips, the second opens the post. The alt is `grid image N`.                                                                                                                                                                                                                                                                                                              | 2.1.1, 4.1.2        |
| 3   | Login, signup, `/admin/request`, account sidebar      | `role="submit"` isn't a role: these buttons lose their button role                                                                                                                                                                                                                                                                                                                                                                                                                                        | 4.1.2               |
| 4   | New-post window                                       | The photo input and the caption have no label                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 1.3.1, 3.3.2, 4.1.2 |
| 5   | Comment delete, admin comment delete, admin user edit | Their `aria-label` says "delete post"                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 2.4.6, 4.1.2        |
| 6   | `/posts` grid tiles                                   | `alt="image card"` on every tile, so each link to a post is named "image card"                                                                                                                                                                                                                                                                                                                                                                                                                            | 1.1.1, 2.4.4        |
| 7   | Every page                                            | No skip link. Only Home has a `<main>` and an `<h1>`. The header's site name is an `<h2>` on every page. The post page has no heading of its own.                                                                                                                                                                                                                                                                                                                                                         | 2.4.1, 1.3.1        |
| 8   | Footer menu links (Home/Posts/About)                  | No visible focus indicator                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 2.4.7               |
| 9   | Home                                                  | The background blobs, the bouncing "Head to Gallery" button and the "Flip me over!!" note animate forever, including when the system asks for reduced motion                                                                                                                                                                                                                                                                                                                                              | 2.2.2               |
| 10  | Mobile menu account bar (`AuthBlock`, below 1024 px)  | Its `bg-dark-1` background fails under its text: `light-4` 3.0 (logged out, below 768 px), `dark-3` 3.1 (logged out, 768–1023 px), and the username and Logout 4.5 (logged in)                                                                                                                                                                                                                                                                                                                            | 1.4.3               |
| 11  | Home with no posts, or a failed load                  | The spinner turns forever with nothing loading                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 2.2.2               |
| 12  | New-post window while uploading (from #17)            | The live region announces every percent of progress                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 4.1.2 (noise)       |

**Already fine:**

- The new-post window and the account sidebar keep focus inside, close on Escape, and return focus to the button that opened them.
- Alerts are `role="alert"`.
- `<html lang="en">` is set.
- The mobile menu button has `aria-expanded`. The menu is a disclosure, not a dialog, so Tab may leave it.
- `<LoadMoreStatus>` (#18) already announces in a polite live region and offers a "Try again" button.
- Every other page area, open window and sidebar passed axe apart from contrast.

## Goals

- **The automated check:** every page, in every session and at 390, 800 and 1200 px, passes WCAG 2.0 A/AA, plus the `landmark-one-main` and `page-has-heading-one` best practices.
- **The keyboard:** a skip link, a visible focus ring on everything focusable, a sensible order, and every action reachable, including the Home tiles.
- **Screen readers:** what one hears matches what's on screen. Every control has the name its visible text or purpose gives it.
- **Motion:** none of it runs for more than about 5 seconds, and none of it runs when the system asks for reduced motion.
- **Regressions:** they fail CI. Structural problems are caught by axe on the server-rendered pages, colour by a contrast test, and the Home tiles by a keyboard unit test.

## Non-goals

- AAA, and criteria that only arrived in WCAG 2.1 or 2.2 (target size, reflow, focus not obscured). Anything the walk shows along the way is noted, not fixed.
- Changes inside the component libraries (`@bobbykim/manguito-theme`, `mcl-footer`, `mcl-forms`, `mcl-cards`). Everything here is fixed from the app: colour tokens, slots, props, CSS, and an app-side tile in place of `MclCardC`.
  - The footer title is an `<h2>` that comes from `MclFooterA`. It's allowed, so it stays.
  - Escape doesn't close the mobile menu, which isn't required for a disclosure. It could be raised on the library.
- The About page's content (#20). It still gets the shared layout fixes.
- A real browser in CI (owner chose approach A below).

## Anti-goals

- Doing more than shifting colours. The site should look the same apart from:
  - the deeper pink and green;
  - the darker grey for the text and the mobile account bar that fail today;
  - the login card turning near-white;
  - a skip link that appears only on focus;
  - animations that settle after a few seconds;
  - a short message in place of an endless spinner.
- Something that works by mouse or touch stopping working. The Home tiles keep their flip.
- A screen-reader name that differs from the visible text, or content hidden from screen readers just to pass the check.
- A test that passes because it checked nothing, such as an empty page list or an empty pair list.

## Constraints

- **Colours are the theme's CSS variables.** Overriding `--mcl-*` on `:root` in `app/assets/css/styles.css` changes both `mcl-*` and Tailwind's `text-*`/`bg-*` utilities.
- **Contrast thresholds:** 4.5:1 for normal text and 3:1 for large text (at least 24 px, or 18.66 px bold). Disabled controls are exempt. Ratios are compared unrounded: the footer's pink "IT" passes at 3.005.
- **No new hydration mismatches,** and `<ClientOnly>` stays banned (#19).
- `isomorphic-dompurify`'s jsdom pin (25) stays.

## Approaches

**Colour (owner's decision: A).**

- **A. One deeper pink everywhere: `#d02b78`.** Chosen. It needs two small changes elsewhere: the login card turns near-white, and the pink buttons' text turns from `light-3` to white.
- B. Keep `#ec489a` for fills and decoration, and use a darker pink only for text. Declined: two pinks to keep straight.
- C. Dark text on pink buttons. Declined: pink text on light backgrounds still needs a darker pink.
- `#c41f68` passes on the login card but fails in the footer's dark band (2.6). Declined in favour of `#d02b78`.

**Keeping it accessible (owner's decision: A).**

- **A. axe on the server-rendered pages in the existing `api` test project, plus a contrast unit test over the colour pairs the site uses, plus targeted tests for states that only exist after a click. The browser walk (axe and keyboard, before and after) goes in the PR as evidence.** Chosen: one dev dependency, no browser download, seconds of CI time.
- B. Playwright and axe in CI. Declined for the same reason as in #19: a browser download on every PR for little beyond what A and the walk catch.
- C. The browser walk only. Declined: nothing would stop regressions.

**Home tiles (owner's decision: a).**

- **(a) An app-built flip card with the same look and the same two steps.** Chosen.
- (b) Plain links like `/posts`. Declined: the "Flip me over!!" game would go.

**Home animations (owner's decision: a).**

- **(a) Run about 5 seconds, then stop.** Chosen.
- (b) Loop, with a pause button. Declined.

## The design

1. **Colours.**
   - In `styles.css`, on `:root`:
     - `--mcl-primary: #d02b78`;
     - `--mcl-success`: the smallest darkening of the same green that passes under white text;
     - `--mcl-warning`, or the Cancel button's text colour: whichever keeps its look (builder's call).
   - Text and backgrounds that still fail move to a passing token:
     - the pink buttons' `text-light-3` becomes `text-light-1`;
     - the login page's light-grey card behind its pink links becomes `light-1`;
     - `text-dark-1` where it fails (comment author and date, "That's every photo…", and any others the walk finds) becomes `text-dark-2`.
   - `--mcl-dark-1` itself is not overridden: it's also a background, and no single value passes on both sides (my call).
   - The mobile account bar (`AuthBlock` below `lg`) gets a `dark-2` background with `light-1` text at every width below 1024 px (my call).
2. **Structure.**
   - Both layouts wrap the page slot in `<main id="main">` (`index.vue`'s own `<main>` goes).
   - Both layouts start with a "Skip to content" link to `#main`, visible only when focused.
   - The header's site name stops being a heading.
   - Each page has exactly one `<h1>`: the existing page title promoted from `<h2>`, with lower headings shifted so no level is skipped.
   - The post page gets a heading too. My call: a visually hidden `<h1>` such as "Post by <author>".
   - Home's "Welcome to" `<h3>` above its `<h1>` becomes text.
3. **Home tiles.**
   - `GridImages.vue` drops `MclCardC` for an app component (`app/components/home/FlipCard.vue`) that copies its look: the colour face, the flip, and the photo on the back.
   - Before flipping, the tile is a `<button>` named "Flip photo N" (N counts from 1).
   - After flipping, the photo side is a link to the post, named by the post's caption: its `alt`, trimmed, with "Photo of Manguito" for an empty one. Focus stays on the tile as it turns.
   - Mouse and touch keep the two steps.
   - Under reduced motion, the flip is instant.
4. **Names and roles.**
   - Drop `role="submit"` everywhere (the buttons are already `type="submit"`, or become so).
   - The delete and edit buttons say what they act on: "delete comment", "edit user".
   - `/posts` tiles get the post's caption as `alt`, trimmed in the same way as the Home tiles, with the same fallback.
   - The new-post window labels its fields visibly, with `MclFormGroup`'s `label` ("Photo", "Caption").
5. **Upload announcements.** The live region announces the stage ("Preparing photo", "Uploading", "Saving") and not every percent. The progress bar keeps `aria-valuenow` but sits outside the live region.
6. **Focus.**
   - The footer menu links get the site's focus ring (app CSS on the footer's links, `focus-visible`).
   - The walk checks every focusable element on every page for a ring, and fixes any others it finds the same way.
7. **Motion.**
   - The Home animations run for about 5 seconds, then stop: the blobs, the "Head to Gallery" bounce and the "Flip me over!!" bounce, through finite iteration counts.
   - Under `prefers-reduced-motion: reduce`, they don't run at all. Neither do the page transition or the tile flip, and `useWindowScroll`'s smooth scroll becomes instant.
   - Home's spinner shows only while the posts are loading. With no posts, or a failed load, it shows a short message instead (my call).
   - The `/posts` and post-page spinners only show while something loads, so they stay.
8. **Infinite scroll (#18).** No change expected. The walk confirms that tabbing through tiles loads the next page, that the live region announces it, and that "Try again" is reachable by keyboard.
9. **Automated checks.**
   - `axe-core` (and jsdom, if the `api` project needs its own) becomes a dev dependency.
   - A test in `test/pages/` renders each page with `page(path, token)` (logged out / USER / ADMIN, with seeded posts and comments) and runs axe on the HTML with the WCAG 2.0 A/AA rules plus `landmark-one-main` and `page-has-heading-one`. It expects no violations.
   - `color-contrast` is off in that test (no layout without a browser), and the test fails if its page list is empty.
   - A unit test computes the contrast of each `[name, foreground, background, large?]` pair. The list is written by hand from the templates (my call: an automatic scan for every pair isn't worth its size), and it includes the footer's pink "IT" on `dark-3` as large text.
     - It reads the token values from `styles.css` and the theme's defaults, so a colour change is checked.
     - It compares unrounded ratios, and fails on an empty list.
     - The browser walk's axe contrast check is the backstop, in the PR.
   - Targeted unit tests:
     - the Home tile is a focusable button; Enter flips it, and the link that appears is named by the caption and goes to the post;
     - Home shows the message, not the spinner, when there are no posts;
     - the new-post window's fields have labels;
     - the upload region announces stages, not percentages.
   - A file-scan test bans `role="submit"`, `alt="image card"` and `MclCardC`, like `libraryMigration.test.ts`.
10. **CLAUDE.md:** an "Accessibility" bullet covering:
    - one `<h1>` and `<main>` per page via the layout, with the skip link;
    - colours only through tokens, with each new text/background pair added to the contrast test;
    - labels on every field, names that match the visible text, and nothing clickable that isn't a button or link;
    - motion that stops within 5 seconds and respects reduced motion;
    - the axe test as the gate.
11. **Before merge:** the owner does a short screen-reader pass on the Vercel preview (VoiceOver or TalkBack), following a checklist in the PR.

## Tests (per finding)

| Finding                       | Test                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| 1, 10 contrast                | contrast unit test over the used pairs                                                           |
| 2 Home tiles                  | mounted unit test (keyboard flip and link); ban on `MclCardC`                                    |
| 3 roles, 5 names, 7 structure | axe on server-rendered pages (all sessions); ban test                                            |
| 4 labels                      | axe test if the window renders on the server; otherwise a mounted unit test                      |
| 6 alt                         | axe (no `image-alt` failure) plus an SSR assertion that a `/posts` tile's `alt` is its caption   |
| 8 focus, 9 motion             | browser walk (keyboard and `reducedMotion: 'reduce'`, animations stopped after 6 s), PR evidence |
| 11 spinner                    | mounted unit test of Home's empty state                                                          |
| 12 announcements              | mounted unit test of the upload status                                                           |
| All                           | the axe and keyboard walk at 390, 800 and 1200 px, before and after, in the PR                   |

## Left to the builder

- The exact darker values for green and warning (smallest change that passes).
- Which `dark-1` text uses move to `dark-2`, from the walk and the templates.
- The visually hidden class: Tailwind's `sr-only`.
- How the contrast test reads the token values.
- Which jsdom the axe test uses, keeping the dompurify pin intact.
- How `FlipCard` copies `MclCardC`'s look (read its markup in `node_modules/@bobbykim/mcl-cards`).
