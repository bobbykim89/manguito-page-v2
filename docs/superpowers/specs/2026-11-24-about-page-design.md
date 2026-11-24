# About page copy (#20): design

**Why:** The About page says one generic sentence. The owner wants it to tell Manguito's story and what the site is, in the same voice as the Home page. This is a content update only: the layout, photo and links stay. The owner asked for a draft, and approved this text.

**Goals**

- Replace the page's text with the approved copy (below).
- Give the page its own description for search and link previews.
- Make the version line stay correct on its own.

**Non-goals**

- Layout or style changes. The paragraphs keep today's `text-lg font-bold`.
- A new photo.
- Changes to the GitHub/LinkedIn/email links.

**Anti-goals**

- Text that differs from the approved copy.
- A version number that goes stale again.
- Breaking the accessibility check `/about` already passes: one `<h1>`, contrast, link names.

**Approaches**

- **Version from `package.json` through `appConfig` (chosen; my call).** `nuxt.config.ts` imports `package.json` and sets `appConfig.version`. The page reads `useAppConfig().version`. Only the version string reaches the client bundle.
- Import `package.json` in the page. Declined: it would ship the whole file, dependency list included, to the browser.
- Keep the hard-coded "0.1.1". Declined: it's the line that goes stale.

**The copy (approved)**

> **About Manguito Page**
>
> Manguito Page is a photo diary of Manguito, a peach-faced lovebird who came to us one late May as a fragile baby who couldn't even chew banana. These days he chirps, flies laps around the house, steals bites of our food and sticks close to my wife.
>
> Here you'll find his everyday moments: the cuddles, the millet and the mischief. Browse the gallery, and sign up if you'd like to comment on your favourite photos.
>
> I built the site myself and keep improving it as a side project. It's made with Nuxt, and you can install it as an app on your phone.
>
> Version: {package.json version}
> Maintainer: Bobby Kim

**Meta (approved):** `description`, `og:description` and `twitter:description` are all "Meet Manguito, a peach-faced lovebird, and the story behind his photo blog." The title meta stays.

**Tests:** the server-rendered `/about` contains:

- each paragraph;
- `Version: <package.json version>`;
- the three description metas with the approved text.

The existing a11y test keeps covering `/about`.

**Left to the builder:** where the test lives (`test/pages/ssr.test.ts` follows the pattern), and the apostrophe escaping in the assertions.
