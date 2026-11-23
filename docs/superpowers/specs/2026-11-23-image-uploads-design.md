# Reliable image uploads (issue #17)

## Why

Issue #17: "Uploads are fragile because of Vercel's request body size limit."

The owner's words: browser compression is set up, "but sometimes it still fails because image is too big after compression. If you make image further smaller then it would compromise image resolution, so I am wanting to have image size that's best quality that's meeting the size limitation."

The issue's checklist:

- images of any reasonable size upload;
- formats (HEIC) and quality loss from double compression are checked;
- options are compared and one is chosen;
- uploads show progress and clear errors, with file type and size validation and server-side verification;
- orphaned Cloudinary assets are cleaned up.

### Today (master at `b6a5533`)

**The client** (`app/pages/posts/index.vue`, new-post modal):

- It runs `browser-image-compression` with `maxSizeMB: 2, maxWidthOrHeight: 1200, useWebWorker: true`.
- That library meets `maxSizeMB` by lowering quality **and** shrinking the dimensions, and it keeps the input's format: a PNG stays a PNG.
- It posts `FormData` (`image`, `content`) through `postStore.createNewPost` → `$api`.
- It closes the modal and clears the form whether the upload worked or not.

**The server** (`server/api/post/index.post.ts`):

1. `checkAuth`, then `requireRole('ADMIN', 'MANAGER')`.
2. `readFormDataText` reads the caption.
3. `uploadCloudinary` (`server/utils/cloudinary.util.ts`):
   - accepts only `image/jpeg` and `image/png`, judged by the **declared** type;
   - base64-encodes the file and uploads it to `config.cloudinaryFolderName`;
   - sets `e.context.file.imageId`.
4. `postController.createNewPost` saves the post. If the save fails, the Cloudinary image is orphaned.

**The limits:**

- Vercel rejects a function request body over **4.5 MB**. It answers 413 with its own page, not our envelope, so the client shows "Could not reach the server, please try again."
- The Cloudinary free tier allows **10 MB** and **25 megapixels** per image.

**What visitors download:** never the stored file, only resized copies that Cloudinary makes once and caches:

- the grid: `c_scale,w_480`;
- the home page: 320 px;
- the post page: `NuxtImg` 484×645;
- share images: 480 px.

So the stored file's size affects the upload's time, the first render of each size, and storage. It doesn't affect how fast pages load.

**HEIC:**

- The server rejects HEIC photos from iPhones.
- Chrome and Firefox can't decode HEIC, so they can't compress it either.
- iOS Safari converts a picked photo to JPEG when the file input doesn't accept HEIC.

## Approaches

The owner picked **A**.

- **A. Keep the upload going through our server, and size the photo in the browser to fit (chosen).**
  - The browser scales the photo to at most 2400 px on its long side.
  - It picks the highest JPEG quality that keeps the file under the budget, and shrinks the dimensions only if even the lowest quality doesn't fit.
  - The server verifies the file and cleans up after a failed save.
  - The owner prefers uploads through the server, and at a 2400 px cap the 4.5 MB limit stops biting.
- **B. A signed upload from the browser straight to Cloudinary.**
  - It skips Vercel's limit entirely.
  - But it needs a signing endpoint, server-side checks that an uploaded asset is ours before a post is saved, and cleanup of images uploaded for posts that never saved.
  - The owner would rather not upload directly. It only pays off for originals much larger than 4 MB.
- **Rejected:** keeping `browser-image-compression` with bigger numbers. It shrinks the dimensions to meet the size, which is what the owner wants to avoid, and it keeps PNGs as PNG.

## Goals

1. **Every reasonable photo uploads.** That's a JPEG, PNG or WebP of any size up to 50 MB, or a HEIC on iOS Safari (converted by the browser). It never hits Vercel's limit.
2. **Best quality within the limit.**
   - The stored image is at most **2400 px** on its long side, which is the owner's choice.
   - It's re-encoded as JPEG at the **highest quality** that fits the **upload budget of 4 MB**. That leaves headroom under Vercel's 4.5 MB for the caption and the multipart framing.
   - The dimensions shrink only when even the lowest allowed quality doesn't fit.
3. **The server verifies what it receives** before anything reaches Cloudinary:
   - the file's real type, read from its first bytes;
   - its size;
   - that it's not empty.
4. **No orphans.** If the post fails to save after the upload, the server deletes the uploaded image. Deleting a post already deletes its image.
5. **The person uploading sees what's happening:**
   - "Preparing photo…" while it's sized;
   - upload progress as a percentage;
   - clear messages for each failure.

   On failure the modal stays open with the form intact, so they can retry. On success it closes and clears.

6. **Tests** cover the sizing search, the client errors, and the server checks and cleanup. CLAUDE.md is updated.

## Non-goals

- Direct-to-Cloudinary uploads (B).
- Converting HEIC in Chrome or Firefox with a WASM decoder. Those browsers get a clear message instead.
- Changing how images are delivered.
  - Adding `f_auto,q_auto` to the delivery URLs would make pages lighter, but it's a separate change. I'm listing it here as a suggestion for the owner, not doing it in this branch.
- Re-processing images that are already uploaded.
- Video, multiple images per post, or editing a post's image.
- The new-post caption's whitespace handling. The server already refuses a blank caption.

## Anti-goals

These would make it a failure even if the tests pass:

- **A photo that fits the budget at 2400 px is stored any smaller,** or at a lower quality than the search could have kept.
- **Any image bytes reach Cloudinary before the role check, the caption check and the file verification all pass.**
- **A failed upload loses the caption and photo the person picked.**
- **Tests or the walkthrough touch the real Cloudinary.** The API tests use the local fake (`test/setup/fakes.ts`). The browser walkthrough intercepts `POST /api/post` instead of letting it reach the server.
- **Location data (EXIF GPS) from a phone photo is uploaded.** Re-encoding through a canvas drops it. A file must never be sent without being re-encoded.

## Constraints

- **Conventions (CLAUDE.md):**
  - thin routes;
  - errors via `apiError` with user-facing sentences;
  - client API actions through `useApiAction().run`;
  - stores resolved before any `await`;
  - browser-only code guarded.
- **The middleware order stays:** `checkAuth` → `requireRole` → caption → file verification → upload. A refused or incomplete request never reaches Cloudinary.
- **Vercel's 4.5 MB body limit** is a platform limit. A request over it never reaches our code.
- **Cloudinary's free-tier limits** are 10 MB and 25 MP. 2400 × 2400 is 5.8 MP and the budget is 4 MB, so both always hold.
- **No new heavy dependencies.** `browser-image-compression` is removed. The sizing uses the browser's own `createImageBitmap` and canvas.

## Design

### Sizing in the browser

This goes in a new `app/utils/fitImage.ts`. The search is pure and testable; the canvas encoding is the only part that needs a browser.

**Constants** (exported; `UPLOAD_BUDGET` lives in `shared/dto/limits.ts`, so the server uses the same number, and is re-exported here):

- `MAX_EDGE = 2400`
- `UPLOAD_BUDGET = 4 * 1024 * 1024`
- `QUALITY_MAX = 0.92`
- `QUALITY_MIN = 0.6`
- `MAX_INPUT_BYTES = 50 * 1024 * 1024`

**The search.** `fitImage(width, height, encode)`, where `encode(w, h, quality) → Promise<Blob>`:

1. Scale `(width, height)` so the long edge is at most `MAX_EDGE`. Never upscale.
2. Encode at `QUALITY_MAX`. If it fits `UPLOAD_BUDGET`, use it. This is the common case.
3. Otherwise, search between `QUALITY_MIN` and `QUALITY_MAX` for the highest quality that fits: a binary search of about 5 steps, keeping the best fit.
4. If even `QUALITY_MIN` doesn't fit, scale the dimensions by 0.85 and repeat step 3, until it fits.
   - It stops below `MIN_EDGE = 600` px on the long edge and throws the "too large to upload" message. That's unreachable for real photos, but it guarantees the loop ends.
5. Return the blob, its width and height, and the quality used.

**`prepareUpload(file: File): Promise<File>`** is the browser part:

- **Refuse before decoding:**
  - a file over `MAX_INPUT_BYTES` (message below);
  - `image/heic` or `image/heif` (message below).
- **Decode** with `createImageBitmap(file, { imageOrientation: 'from-image' })`, so the phone's rotation is applied. If decoding fails, show the unreadable-format message.
- **Draw** onto a canvas on a white background, so a transparent PNG doesn't turn black.
- **Encode** with `canvas.toBlob('image/jpeg', q)`, using `OffscreenCanvas` where available and a DOM canvas otherwise.
- **Always re-encode,** even a small JPEG. That drops EXIF, including GPS, and normalises the orientation.
- **Return** a `File` named `<original name without extension>.jpg`, type `image/jpeg`.

**The file input** gets `accept="image/jpeg,image/png,image/webp"`. iOS then hands over JPEG for HEIC photos.

### Uploading with progress

`fetch` and `$api` can't report upload progress, so the new-post upload uses `XMLHttpRequest`:

- **`uploadWithProgress<T>(url, body: FormData, { token, onProgress }): Promise<T>`** lives in `app/utils/uploadWithProgress.ts`.
  - It sends the `Authorization` header the way the `$api` plugin does.
  - It reports `upload.onprogress` as 0–100.
  - It parses the envelope:
    - `{ ok: true, data }` → `data`;
    - `{ ok: false, error }` → throw `ApiError(status, code, message, details)`;
    - **413** without an envelope (Vercel's own response) → throw `ApiError(413, 'PAYLOAD_TOO_LARGE', 'This photo is too large to upload. Please choose a smaller one.')`;
    - no response at all → the existing unreachable error (status 0).
- **`postStore.createNewPost(payload, { onProgress })`** runs it through `run(...)`, so the alerts and dead-session handling stay the same, and returns `true` on success.
  - The token comes from `useAuthToken()`, resolved in the store's setup.

### The new-post modal (`app/pages/posts/index.vue`)

**States:**

| State     | What the person sees                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| idle      | the form                                                                                                                                                                             |
| preparing | "Preparing photo…"; Save and Cancel disabled                                                                                                                                         |
| uploading | a progress bar with "Uploading… 42%" (`role="progressbar"`, `aria-valuenow`); Save disabled. At 100%, while the server sends it on to Cloudinary and saves, the text reads "Saving…" |
| failed    | the form, untouched, so they can press Save again                                                                                                                                    |

- **On success:** the modal closes and clears, the success alert shows as today, and the new post is prepended to the grid.
- **Closing the modal mid-upload** (the X, or Escape, which the theme's `Modal` always allows) **doesn't cancel the upload.** It finishes in the background, and its result arrives as the usual alert, with the post prepended on success.
  - While an upload is in flight, `onModalClose` keeps the caption and the photo. They're cleared only after a success.
  - So a failure, or reopening the modal before it finishes, finds the form as it was. Reopening during the upload shows the progress again.
  - Cancel stays disabled while preparing and uploading. There's no abort, because the server may already have the photo and would still save the post. (My call.)
- **Client-side errors** (sizing, type, too large an input) show as alerts through the alert store, and the form stays.
- Server errors alert through `run`, and the form stays.

**Messages** (new copy, verbatim):

| Case                                                 | Message                                                                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| HEIC/HEIF, or an image the browser can't decode      | "This photo's format can't be read here. Please choose a JPEG, PNG or WebP. On iPhone, Safari converts photos automatically." |
| An input over 50 MB                                  | "This photo is over 50 MB. Please choose a smaller one."                                                                      |
| Too large after all (413, from the server or Vercel) | "This photo is too large to upload. Please choose a smaller one."                                                             |

The existing messages stay: Cloudinary failure, unreachable, caption errors.

### The server

**A new API error code:** `PAYLOAD_TOO_LARGE`, status 413, in `shared/types/api.types.ts` (`ApiErrorCode`, `API_ERROR_STATUS`) and CLAUDE.md's code list.

**`uploadCloudinary` becomes verify-then-upload.** The order is unchanged. Before uploading, it checks:

- **a missing or empty file** → 400 `VALIDATION_FAILED` "Please choose a photo to upload.";
- **over 4 MB** (`UPLOAD_BUDGET`, shared from `shared/`, so the client and server agree) → 413 `PAYLOAD_TOO_LARGE`, "This photo is too large to upload. Please choose a smaller one.";
- **the real type from the first bytes:** JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A` or WebP (`RIFF....WEBP`). Anything else → 415 `UNSUPPORTED_MEDIA_TYPE` "Please upload a JPEG, PNG or WebP image." The declared `file.type` is ignored for this decision.

The browser always sends JPEG; PNG and WebP are accepted for other clients. The upload to Cloudinary is unchanged (a data URL into the folder), except that the data URL uses the type detected from the bytes, not the declared one.

**Cleanup in `postController.createNewPost`:** if saving or populating the post throws after `e.context.file.imageId` was set, call `deleteCloudinaryImage(imageId)` and then rethrow the original error. If the delete itself fails, log it and still rethrow the original.

### Quality and double compression

- **The upload is encoded once,** at the chosen quality, from the original pixels. It's never compressed and then compressed again in the browser.
- **Cloudinary stores the upload as-is.** It doesn't re-encode on upload, because no incoming transformation is set.
- **Each size visitors see is made once from that stored image,** so there is exactly one extra lossy step, the same as today but from a much better source: up to 2400 px at 0.92, instead of 1200 px at whatever reached 2 MB.

## Tests

### Unit tests (`test/unit/`)

**`fitImage`,** with a fake `encode` whose size is a function of `(w, h, q)`:

- a small photo stays its size and gets 0.92;
- 4000×3000 becomes 2400×1800;
- it is never upscaled;
- when 0.92 is too big, it keeps the highest quality that fits, and the result fits;
- when even 0.6 doesn't fit, the dimensions drop by 0.85 steps until it fits, and only then;
- the search stays within a bounded number of encodes.

**`prepareUpload`:** HEIC and HEIF, and over 50 MB, are refused with their messages without decoding. Mock `createImageBitmap` to throw for the unreadable message.

**`uploadWithProgress`,** with a fake `XMLHttpRequest`:

- progress events map to 0–100;
- an ok envelope resolves `data`;
- an error envelope throws an `ApiError` with its code;
- a 413 without an envelope throws `PAYLOAD_TOO_LARGE` with its message;
- a network error throws the unreachable error;
- it sends the Authorization header.

**`postStore.createNewPost`:** success prepends and returns `true`; failure alerts, returns `false`, and leaves the list alone.

**The posts page modal:**

- a failed upload keeps the modal open, with the caption still there;
- closing it mid-upload keeps the caption, and a later failure alerts;
- success closes it;
- Save is disabled while preparing or uploading.

### API tests (`test/api/`, using the local Cloudinary fake)

- A JPEG, a PNG and a WebP, recognised by their bytes, are accepted.
- A text file declared as `image/jpeg` gets 415, and nothing reaches the fake Cloudinary (`cloudinaryCalls()`).
- A file over 4 MB gets 413 `PAYLOAD_TOO_LARGE`, and nothing is uploaded.
- An empty file gets 400.
- **A post whose save fails after the upload:** the fake Cloudinary records an upload and then a destroy, and the response is the save's error. How to force the failure is the builder's call. For example, delete the author between the caption check and the save, or make `Post.prototype.save` reject in the test server.
- The existing post-create tests stay green. `test/api/inputErrors.test.ts` checks the old "File not found" message, so it's updated to the new "Please choose a photo to upload." The existing tests already send real PNG bytes, so they pass the byte check.

### Walkthrough (`pnpm dev`, local DB, a real browser)

- **Intercept `POST /api/post`** with Playwright's `page.route` and answer it with a fake success. **The real upload never happens.**
- **Pick a large JPEG** generated in the test, e.g. 6000×4000 with noise, so it's several MB. The intercepted request's image part is a JPEG of at most 4 MB, with a long edge of exactly 2400 (read the dimensions from the JPEG header).
- **Pick a small photo:** it keeps its dimensions.
- **Progress:** the progress bar appears while the request is held.
- **Failure:** answer with a 413 page → the "too large" alert shows, and the form keeps its caption.
- **A `.heic`-named file** typed as `image/heic` gets the format message.

## Calls I made

The owner can overrule any of these.

- **The 4 MB budget,** with 0.5 MB of headroom under Vercel's 4.5 MB.
- **Quality from 0.92 down to 0.6,** then shrinking the dimensions in 0.85 steps.
- **Always re-encode,** even a small JPEG. That drops location data and fixes rotation, at the cost of one encode of photos that were already small.
- **JPEG output for everything,** with a white background behind transparency.
- **A 50 MB input cap,** to avoid decoding enormous files.
- **HEIC on desktop Chrome or Firefox gets a message,** not a converter.
- **The modal stays open on failure.** That fixes the pre-existing "a failed create clears the form".
- **Closing the modal mid-upload doesn't cancel it.** It finishes in the background, and the form is kept until a success.
- **A new `PAYLOAD_TOO_LARGE` (413) code.**
- **`f_auto,q_auto` on delivery is suggested, not done.**

## Left to the builder

- `OffscreenCanvas` or a DOM canvas, and whether sizing runs in a worker. The main thread is acceptable for one photo.
- The fake encoder's size model in the tests.
- How to force the failed save in the API test.
- The progress bar's markup, matching the theme's colours.
- Generating the walkthrough's test images.
