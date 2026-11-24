# Custom fonts (#27): design

**Why:** The site was designed with Inter for text and Permanent Marker for accents ("Flip me over!!"). Since the move to Tailwind 4 neither has ever loaded. `styles.css` declares them with Tailwind 3 names (`--font-family-inter`, `--font-family-marker`), so `font-inter` and `font-marker` generate nothing, no CSS mentions the fonts, and `@nuxt/fonts` never downloads them. Everything renders in the browser's default sans-serif.

**Owner's decision (A):** Inter becomes the site's base font everywhere (header, footer, auth pages, post page, About), not only where `font-inter` is written today.

**Goals**

- Inter is the base font of every page, in the weights the site uses: 300, 400, 600, 700 (`font-light`, normal, `font-semibold`, `font-bold`).
- Permanent Marker (400) renders where `font-marker` is used.
- The fonts are served from the site itself, with no runtime requests to a font service.
- The build, the dev server and the tests need no font service. A provider being down (as `api.fontshare.com` was in #11) can't break them.
- No layout shift as the fonts load: `@nuxt/fonts`' metric-matched fallbacks.

**Non-goals**

- Changing font sizes, weights or which elements use the marker font.
- Other typefaces.
- Subsetting beyond the Latin subset the packages ship.

**Anti-goals**

- A build that downloads from Google, Bunny or Fontshare (CI and the test build would then depend on them).
- Text that is invisible while the font loads (FOIT). Keep `font-display: swap`, the default.
- Any hydration change: fonts are CSS only.

**Approaches**

- **Fontsource packages through `@nuxt/fonts`' `npm` provider, with network providers off (chosen; my call).**
  - `@fontsource/inter` and `@fontsource/permanent-marker` (5.3.0) become dependencies.
  - `@nuxt/fonts` resolves the families from them and copies the files into `/_fonts/`.
  - It stays fully offline and pinned in the lockfile.
- `@nuxt/fonts`' default providers, Google first. Declined: they download at build time, so builds and the test build depend on a remote service, the issue's own failure case.
- Hand-written `@font-face` with files committed to `public/`. Declined: it duplicates what the module does, including the fallback metrics.

**The design**

1. **`styles.css` `@theme`:**
   - `--font-sans: Inter, ui-sans-serif, system-ui, sans-serif`, Tailwind's base font, which Preflight applies to `html`;
   - `--font-inter: Inter, sans-serif` (kept, so the existing `font-inter` classes stay valid);
   - `--font-marker: 'Permanent Marker', cursive`;
   - the old `--font-family-*` names go.
2. **`nuxt.config.ts` `fonts`:**
   - `families`: Inter with weights `[300, 400, 600, 700]` and Permanent Marker with `[400]`, both `provider: 'npm'`;
   - every network provider disabled;
   - builder checks the exact option names against `@nuxt/fonts` 1.2.0.
3. **Dependencies:** `@fontsource/inter` and `@fontsource/permanent-marker`, exact versions. No build scripts, so `allowBuilds` doesn't change.
4. **CLAUDE.md:** the Toolchain section says the fonts come from the Fontsource packages through `@nuxt/fonts`' `npm` provider, so nothing downloads at build. Use `--font-*` theme names (Tailwind 4).

**Tests**

- **Unit, reading `styles.css`:**
  - `--font-sans` starts with `Inter`;
  - `--font-marker` names `Permanent Marker`;
  - no `--font-family-` declarations (the Tailwind 3 names), plus a ban row.
- **`api` project, on the built app:**
  - the served CSS has `@font-face` rules for `Inter` (each of the four weights) and `Permanent Marker`;
  - every `src` URL is local (`/_fonts/…`), and fetching one returns 200 with a font content type;
  - a fallback face (`Inter Fallback`, with `size-adjust`) exists.
- **The build itself:** CI and the test build run with network providers off, so a passing build shows it needs none.
- **Browser walk** (PR evidence):
  - `document.fonts.check('16px Inter')` and `document.fonts.check('16px "Permanent Marker"')` are true on Home;
  - `getComputedStyle(body).fontFamily` starts with Inter on every page;
  - axe and the hydration check stay at 0;
  - before/after screenshots of Home, `/posts`, About and login, for the owner.

**Left to the builder:** the exact `@nuxt/fonts` option shapes, and how the `api` test finds the CSS (the HTML's stylesheet links or the inlined styles).
