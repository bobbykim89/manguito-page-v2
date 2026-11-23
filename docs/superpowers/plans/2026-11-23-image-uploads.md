# Reliable Image Uploads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every reasonable photo uploads through our server. The browser stores each one at most 2400 px on its long side, at the highest JPEG quality under 4 MB, with progress and clear errors. The server checks each file by its bytes, and deletes the image if the post fails to save. This is issue #17.

**Architecture:**

- **Server:** a pure `detectImageType` and the shared `UPLOAD_BUDGET` gate `uploadCloudinary`. `createNewPost` cleans up on a failed save. There's a new `PAYLOAD_TOO_LARGE` (413) code.
- **Client:**
  - a pure quality/size search (`fitImage`) driven by a canvas encoder (`prepareUpload`);
  - an `XMLHttpRequest` uploader that reports progress (`uploadWithProgress`);
  - `postStore.createNewPost` run through `run`;
  - the new-post modal gains the preparing/uploading states, and keeps the form until a success.

**Tech Stack:** Nuxt 4, Vue 3, Pinia 4, H3 1.15, Cloudinary SDK v2, Vitest (`api` and `unit` projects), happy-dom, Playwright (walkthrough only), `sharp` (walkthrough image generation only; already installed).

**Spec:** `docs/superpowers/specs/2026-11-23-image-uploads-design.md`

## Global Constraints

**Sizing numbers:**

- `MAX_EDGE = 2400`
- `UPLOAD_BUDGET = 4 * 1024 * 1024` (in `shared/dto/limits.ts`)
- `QUALITY_MAX = 0.92`
- `QUALITY_MIN = 0.6`
- shrink factor `0.85`
- `MIN_EDGE = 600`
- `MAX_INPUT_BYTES = 50 * 1024 * 1024`

**Output:** always JPEG (`image/jpeg`, named `<base>.jpg`), drawn on a white background. Always re-encoded, never sent as picked.

**The file input** gets `accept="image/jpeg,image/png,image/webp"`.

**Copy, verbatim** (constants in `shared/dto/limits.ts` as `UPLOAD_MESSAGES`):

- `unreadable`: "This photo's format can't be read here. Please choose a JPEG, PNG or WebP. On iPhone, Safari converts photos automatically."
- `inputTooLarge`: "This photo is over 50 MB. Please choose a smaller one."
- `tooLarge`: "This photo is too large to upload. Please choose a smaller one."
- `noFile`: "Please choose a photo to upload."
- `badType`: "Please upload a JPEG, PNG or WebP image."
- The modal text: "Preparing photo…", "Uploading… N%", "Saving…".

**New API code:** `PAYLOAD_TOO_LARGE` → 413.

**Server middleware order is unchanged:** `checkAuth` → `requireRole('ADMIN', 'MANAGER')` → caption → verify file → upload.

**Never touch the real Cloudinary.** API tests use the fake (`cloudinaryCalls()`, `failNext`). The walkthrough intercepts `POST /api/post` with `page.route`.

**Conventions:**

- client API actions go through `useApiAction().run`;
- stores are resolved before any `await`;
- browser-only APIs are guarded;
- Prettier style; run `pnpm lint` and `pnpm format` before each commit;
- Conventional Commits with a path scope, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Process:**

- Don't use `SKIP_BUILD=1` after a server or app change unless a build ran since.
- After adding a composable, clear `node_modules/.cache/nuxt` and `node_modules/.vitest-cache`. This plan adds none, only `app/utils`, which the tests import explicitly.

## Review Focus

1. **A second Save** (double click, or Enter) while preparing or uploading sends nothing more. Pinned in Task 5 (`a second Save while busy sends nothing`).
2. **A session that expires during the upload:** a 401 envelope over XHR ends the session through `run`, `createNewPost` returns `false`, and the form keeps its caption. Pinned in Task 4 (`an expired session during upload logs out and returns false`) and Task 5's failure test.
3. **A tall portrait or panorama:** 1000×5000 has its long edge (the height) capped at 2400, keeping the aspect ratio. Pinned in Task 3 (`caps the long edge of a portrait`).
4. **A real JPEG declared as `image/png`** (or the reverse) is accepted by its bytes and uploaded with the detected type. Pinned in Task 1 (`judges the type by the bytes, not the declared type`).
5. **Phone rotation (EXIF orientation 6):** a sideways-stored photo arrives upright, with its width and height swapped. Checked in the Task 6 walkthrough with a `sharp`-made JPEG carrying orientation 6.

---

### Task 1: Server checks the file by its bytes and size; new 413 code

**Files:**

- Create: `server/utils/imageType.util.ts`, `test/unit/imageType.test.ts`, `test/api/uploadChecks.test.ts`
- Modify:
  - `shared/dto/limits.ts` (`UPLOAD_BUDGET`, `UPLOAD_MESSAGES`)
  - `shared/types/api.types.ts` (`PAYLOAD_TOO_LARGE: 413`)
  - `server/utils/cloudinary.util.ts`
  - `server/utils/index.ts`
  - `test/api/inputErrors.test.ts`

**Interfaces:**

- Produces:
  - `UPLOAD_BUDGET: number` and `UPLOAD_MESSAGES: { unreadable; inputTooLarge; tooLarge; noFile; badType }`, from `#shared/dto/limits`;
  - `ApiErrorCode` includes `'PAYLOAD_TOO_LARGE'`, with `API_ERROR_STATUS.PAYLOAD_TOO_LARGE === 413`;
  - `detectImageType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null`, auto-imported in `server/`.
    - JPEG: `FF D8 FF`.
    - PNG: `89 50 4E 47 0D 0A 1A 0A`.
    - WebP: `52 49 46 46` at 0, and `57 45 42 50` at 8.

- [ ] **Step 1: Write the failing tests.**

  **`test/unit/imageType.test.ts`:**
  - **`recognises JPEG, PNG and WebP by their first bytes`:** `[0xff,0xd8,0xff,0xe0,…]` → `'image/jpeg'`; the 8 PNG bytes → `'image/png'`; `RIFF????WEBP` → `'image/webp'`.
  - **`rejects anything else`:** `"hi"` → null; empty → null; `RIFF????WAVE` → null.

  **`test/api/uploadChecks.test.ts`** (with `beforeEach(resetFakes)` and a MANAGER). Use a tiny JPEG made with `sharp` in the test (`sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).jpeg().toBuffer()`), the existing 1×1 PNG, and a WebP from `sharp(...).webp()`.

  | Test                                                  | Form                                          | Assert                                                                                                                   |
  | ----------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
  | `accepts a JPEG, a PNG and a WebP` (one `it.each`)    | the right bytes and declared type             | 201; one upload each                                                                                                     |
  | `judges the type by the bytes, not the declared type` | JPEG bytes declared `image/png`               | 201; one upload                                                                                                          |
  | `refuses a text file declared as a JPEG`              | `"hi"` declared `image/jpeg`                  | `expectApiError(res, 'UNSUPPORTED_MEDIA_TYPE', 'Please upload a JPEG, PNG or WebP image.')`; no upload                   |
  | `refuses a file over 4 MB`                            | 4 MB + 1 bytes starting with a JPEG signature | `expectApiError(res, 'PAYLOAD_TOO_LARGE', 'This photo is too large to upload. Please choose a smaller one.')`; no upload |
  | `refuses an empty file`                               | a 0-byte blob named `bird.jpg`                | `expectApiError(res, 'VALIDATION_FAILED', 'Please choose a photo to upload.')`; no upload                                |

  **`test/api/inputErrors.test.ts`:** `without an image` now expects `'Please choose a photo to upload.'`.

- [ ] **Step 2: Run.** `pnpm vitest run --project unit test/unit/imageType.test.ts`, then `pnpm vitest run --project api test/api/uploadChecks.test.ts test/api/inputErrors.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **The limits and code:** add the constants and the code (and its status).
  - **`detectImageType`:** add it, and export it from `server/utils/index.ts`.
  - **`uploadCloudinary`** checks, in this order:
    1. a missing file, or `file.data.length === 0` → `VALIDATION_FAILED` `noFile`;
    2. `> UPLOAD_BUDGET` → `PAYLOAD_TOO_LARGE` `tooLarge`;
    3. `detectImageType(file.data)` is null → `UNSUPPORTED_MEDIA_TYPE` `badType`.

    The data URL uses the detected type.

- [ ] **Step 4: Run** the same commands. Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add shared/dto/limits.ts shared/types/api.types.ts server/utils test/unit/imageType.test.ts test/api/uploadChecks.test.ts test/api/inputErrors.test.ts
  git commit -m "feat(server/utils/): check an upload's real type and size before it reaches Cloudinary"
  ```

### Task 2: Delete the uploaded image when the post fails to save

**Files:**

- Modify: `server/controller/post/post.controller.ts` (`createNewPost`), `test/api/uploadChecks.test.ts`

**Interfaces:**

- Consumes: `deleteCloudinaryImage(id)` (existing).
- Produces: `createNewPost` behaviour only.

- [ ] **Step 1: Write the failing test** `a post that fails to save deletes its uploaded image` in `uploadChecks.test.ts`:
  1. Insert any post, so the `posts` collection exists.
  2. With `db()`, run `connection.db.command({ collMod: 'posts', validator: { content: { $ne: 'reject me' } } })`.
  3. POST a valid image with caption `reject me`.
  4. Assert:
     - `res.status === 500`, with code `INTERNAL`;
     - `cloudinaryCalls()` paths include one ending `/image/upload`, and then one ending `/image/destroy`;
     - no post with that caption exists.
  5. In `finally`, run `collMod` with `validator: {}`.

- [ ] **Step 2: Run** `pnpm vitest run --project api test/api/uploadChecks.test.ts`. Expected: FAIL (no destroy call).

- [ ] **Step 3: Implement** the cleanup in `createNewPost`:
  1. Wrap `save()` and `populate` in a try.
  2. On a throw, `await deleteCloudinaryImage(file.imageId)` inside its own try/catch, which `console.error`s on failure.
  3. Rethrow the original error.

- [ ] **Step 4: Run** the same command. Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add server/controller/post/post.controller.ts test/api/uploadChecks.test.ts
  git commit -m "fix(server/controller/): delete the uploaded image when the new post fails to save"
  ```

### Task 3: Size the photo in the browser (`fitImage`, `prepareUpload`)

**Files:**

- Create: `app/utils/fitImage.ts`, `app/utils/prepareUpload.ts`, `test/unit/fitImage.test.ts`, `test/unit/prepareUpload.test.ts`

**Interfaces:**

- Consumes: `UPLOAD_BUDGET` and `UPLOAD_MESSAGES` (Task 1).
- Produces, in `app/utils/fitImage.ts`:
  - **The constants:** `MAX_EDGE`, `QUALITY_MAX`, `QUALITY_MIN`, `SHRINK = 0.85`, `MIN_EDGE`, `MAX_INPUT_BYTES`.
  - **`type Encode = (width: number, height: number, quality: number) => Promise<Blob>`.**
  - **`fitImage(width: number, height: number, encode: Encode): Promise<{ blob: Blob; width: number; height: number; quality: number }>`.**
    - It scales to a long edge of at most `MAX_EDGE`, rounding and never upscaling.
    - At each size: try `QUALITY_MAX`; if it fits, return it. Otherwise try `QUALITY_MIN`; if that doesn't fit, shrink by `SHRINK`. Otherwise binary-search between them for 5 steps, keeping the best blob that fits.
    - Below `MIN_EDGE`, it throws `UploadError(UPLOAD_MESSAGES.tooLarge)`.
  - **`class UploadError extends Error`,** whose message is user-facing.
- Produces, in `app/utils/prepareUpload.ts`:
  - **`prepareUpload(file: File): Promise<File>`.**
    - **Refuse first:** `image/heic`, `image/heif`, or a name ending `.heic`/`.heif` → `UploadError(unreadable)`; a size over `MAX_INPUT_BYTES` → `UploadError(inputTooLarge)`.
    - **Decode:** `createImageBitmap(file, { imageOrientation: 'from-image' })`. If it throws → `UploadError(unreadable)`.
    - **Encode:** draw on a white background on an `OffscreenCanvas`, or a DOM canvas when that's undefined, and encode with `image/jpeg`.
    - **Return** `new File([blob], base + '.jpg', { type: 'image/jpeg' })`.

- [ ] **Step 1: Write the failing tests.**

  **`fitImage.test.ts`** uses a fake `encode` returning `new Blob([new Uint8Array(size(w, h, q))])`, with `size = w * h * q * k` for a `k` chosen per test, and counts its calls.
  - **`keeps a small photo's size at the top quality`:** 1200×900 with a small `k` → `{ width: 1200, height: 900, quality: 0.92 }`, 1 encode.
  - **`caps the long edge at 2400`:** 4000×3000 → 2400×1800.
  - **`caps the long edge of a portrait`:** 1000×5000 → 480×2400.
  - **`never upscales`:** 800×600 → 800×600.
  - **`keeps the highest quality that fits`:** choose `k` so that 0.92 doesn't fit and 0.6 does. The result's size is ≤ `UPLOAD_BUDGET`, and quality + 0.06 would not fit. Assert it against the size model.
  - **`shrinks only when the lowest quality does not fit`:** with `k` so that 2400×1800 at 0.6 is over budget, the result is smaller than 2400 wide, and every encode at the first size used quality ≥ 0.6.
  - **`gives up below 600 px`:** with a huge `k`, it rejects with `UploadError` and the `tooLarge` message.
  - **`stays within a bounded number of encodes per size`:** at most 7 encodes per size.

  **`prepareUpload.test.ts`:**
  - **`refuses HEIC by type and by name`:** both `image/heic` and `bird.HEIC` with an empty type → the `unreadable` message. `createImageBitmap` is never called (stub it with a spy).
  - **`refuses over 50 MB`:** a `File` whose `size` is overridden to 50 MB + 1 → the `inputTooLarge` message.
  - **`an undecodable image gets the format message`:** stub `createImageBitmap` to reject → `unreadable`.

- [ ] **Step 2: Run** `pnpm vitest run --project unit test/unit/fitImage.test.ts test/unit/prepareUpload.test.ts`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement** both files as specified.

- [ ] **Step 4: Run** the same command. Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add app/utils/fitImage.ts app/utils/prepareUpload.ts test/unit/fitImage.test.ts test/unit/prepareUpload.test.ts
  git commit -m "feat(app/utils/): size a photo to the best JPEG quality under the upload budget"
  ```

### Task 4: Upload with progress (`uploadWithProgress`, `postStore.createNewPost`)

**Files:**

- Create: `app/utils/uploadWithProgress.ts`, `test/unit/uploadWithProgress.test.ts`
- Modify: `app/stores/postStore.ts`, `test/unit/postStore.test.ts`

**Interfaces:**

- Consumes: `ApiError` (`app/utils/apiError.ts`), `UPLOAD_MESSAGES.tooLarge`.
- Produces:
  - **`uploadWithProgress<T>(url: string, body: FormData, opts: { token?: string | null; onProgress?: (percent: number) => void }): Promise<T>`.**
    - It sets `Authorization: token` when given, and reports `Math.round(loaded / total * 100)` through `onProgress`.
    - It resolves `envelope.data` on `{ ok: true }`, and throws `new ApiError(status, code, message, details)` on an error envelope.
    - A 413 without an envelope throws `new ApiError(413, 'PAYLOAD_TOO_LARGE', UPLOAD_MESSAGES.tooLarge)`.
    - A network error, or any other non-envelope response, throws `toApiError(...)`'s unreachable error: status 0 for a network error, or the real status.
  - **`postStore.createNewPost(payload: FormData, opts?: { onProgress?: (percent: number) => void }): Promise<boolean>`.**
    - It calls `run(() => uploadWithProgress<PostType>('/api/post', payload, { token: token.value, onProgress }), { success: 'Successfully created a new post' })`.
    - On success it prepends and returns `true`; otherwise `false`.
    - `const token = useAuthToken()` is resolved in the store's setup.

- [ ] **Step 1: Write the failing tests.**

  **`uploadWithProgress.test.ts`** uses a `FakeXhr` (stubbed with `vi.stubGlobal('XMLHttpRequest', FakeXhr)`) that records `open`/`setRequestHeader`/`send`, exposes `upload.onprogress`, and lets the test call `respond(status, bodyText)` or `fail()`.
  - **`reports progress as a percentage`:** progress events (50/200, then 200/200) → `onProgress` calls `[25, 100]`.
  - **`resolves the data of an ok envelope`.**
  - **`throws the envelope's error`:** 415 `UNSUPPORTED_MEDIA_TYPE` → an `ApiError` with that status, code and message.
  - **`turns a bare 413 into PAYLOAD_TOO_LARGE`:** a 413 with an HTML body → code `PAYLOAD_TOO_LARGE` and the `tooLarge` message.
  - **`a network error is unreachable`:** `fail()` → status 0, message "Could not reach the server, please try again."
  - **`sends the session token`:** the header `Authorization: Bearer x`.

  **`postStore.test.ts`:** replace `create prepends the new post and alerts` (which mocked `$fetch`) with `FakeXhr` versions:
  - **`create prepends the new post, alerts and returns true`.**
  - **`a failed create alerts, returns false and leaves the list alone`.**
  - **`an expired session during upload logs out and returns false`:** a 401 `UNAUTHENTICATED` envelope → `sessionExpired` is true, and it returns `false`.

- [ ] **Step 2: Run** `pnpm vitest run --project unit test/unit/uploadWithProgress.test.ts test/unit/postStore.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** both pieces.

- [ ] **Step 4: Run** the same command. Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add app/utils/uploadWithProgress.ts app/stores/postStore.ts test/unit/uploadWithProgress.test.ts test/unit/postStore.test.ts
  git commit -m "feat(app/stores/): upload new posts with progress; clear 413 message"
  ```

### Task 5: The new-post modal (preparing, uploading, keeping the form)

**Files:**

- Modify: `app/pages/posts/index.vue`, `package.json` and `pnpm-lock.yaml` (`pnpm remove browser-image-compression`), `test/unit/postsPage.test.ts`

**Interfaces:**

- Consumes:
  - `prepareUpload` and `UploadError` (Task 3);
  - `postStore.createNewPost(form, { onProgress }) → boolean` (Task 4);
  - `useAlertStore().setAlert`.
- Produces, in the page:
  - **`uploadState: Ref<'idle' | 'preparing' | 'uploading'>`** and **`progress: Ref<number>`**.
  - **`busy`** is true unless `uploadState` is `'idle'`.
  - **The template:**
    - `MclInputFile` gets `accept="image/jpeg,image/png,image/webp"`.
    - Save is `:disabled="isCaptionTooLong || busy"`, and Cancel is `:disabled="busy"`.
    - The status line:
      - while preparing: "Preparing photo…";
      - while uploading under 100: a bar `role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100"` and the text "Uploading… {{ progress }}%";
      - at 100: "Saving…".
  - **`onSubmit`:**
    1. Return if `busy`, if there's no file, or if the caption is too long.
    2. `preparing`: `await prepareUpload(file)`. An `UploadError` → `alertStore.setAlert(err.message)`, and back to `idle`.
    3. `uploading`: `await postStore.createNewPost(form, { onProgress: (p) => (progress.value = p) })`.
    4. On `true`, clear the caption and file and `modalRef.value?.close()`.
    5. Always end in `idle` with `progress` 0.
  - **`onModalClose`** clears the form only when not `busy`.

- [ ] **Step 1: Write the failing tests** in `postsPage.test.ts`.
  - **Setup:**
    - `vi.mock('@/utils/prepareUpload', …)` so `prepareUpload` resolves the same file by default, keeping `UploadError` real;
    - stub `XMLHttpRequest` with a controllable fake;
    - use the existing `mountAsAdmin`, `openModal` and `settle` helpers;
    - set the file input with `wrapper.findComponent(MclInputFile).vm.$emit('update:modelValue', new File(['x'], 'bird.jpg', { type: 'image/jpeg' }))`, or the component's own v-model event.
  - **`the file input accepts JPEG, PNG and WebP`:** `input[type="file"]` has `accept === 'image/jpeg,image/png,image/webp'`.
  - **`a failed upload keeps the modal open with the caption`:** respond 502 `UPSTREAM_FAILED` → the dialog still exists, and the textarea value is still the caption.
  - **`a successful upload closes the modal and clears it`:** respond 201 with an ok envelope → the dialog is gone. Reopen → an empty textarea.
  - **`shows progress while uploading`:** hold the response and fire progress 30/100 → `[role="progressbar"]` with `aria-valuenow="30"` and the text "Uploading… 30%".
  - **`a second Save while busy sends nothing`:** hold the response and submit twice → the fake records one `send`.
  - **`closing mid-upload keeps the caption, and a later failure alerts`:**
    1. Hold the response.
    2. Close the modal (Cancel is disabled, so use the modal's close button, or Escape on the dialog).
    3. Respond 502.
    4. Assert the alert message is set. Reopen → the caption is still there.
  - **`a format the browser can't read alerts and keeps the form`:** `prepareUpload` rejects with `new UploadError(UPLOAD_MESSAGES.unreadable)` → the alert shows that message, and no `send` happens.

- [ ] **Step 2: Run** `pnpm vitest run --project unit test/unit/postsPage.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** the page changes, then run `pnpm remove browser-image-compression`.

- [ ] **Step 4: Run** `pnpm vitest run --project unit`, then `pnpm typecheck` and `pnpm test`. Expected: all green.

- [ ] **Step 5: Commit**
  ```bash
  git add app/pages/posts/index.vue package.json pnpm-lock.yaml test/unit/postsPage.test.ts
  git commit -m "feat(app/pages/): new-post modal shows preparing and upload progress, and keeps the form until it succeeds"
  ```

### Task 6: CLAUDE.md and the walkthrough

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md.**
  - **Errors:** add `PAYLOAD_TOO_LARGE` 413 to the code list.
  - **Conventions:** in the new-post middleware sentence, `uploadCloudinary` now verifies the file by its bytes and against `UPLOAD_BUDGET`, and `createNewPost` deletes the image if the save fails.
  - **A new bullet, "Image uploads":**
    - the browser re-encodes every photo with `prepareUpload`/`fitImage`: JPEG, long edge ≤ 2400, the highest quality ≤ 4 MB;
    - `postStore.createNewPost` uploads through `uploadWithProgress` (XHR, for progress);
    - HEIC is converted by iOS Safari, and refused elsewhere.
  - **Client layout:** add `fitImage.ts`, `prepareUpload.ts` and `uploadWithProgress.ts` to the `app/utils/` list.

- [ ] **Step 2: Verify.** Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test`. Expected: all clean.

- [ ] **Step 3: Walkthrough.** Use `pnpm dev` with the local DB, and a playwright-core script in the scratchpad.
  - **Setup:**
    - Seed one MANAGER user with `mongosh`, and log in through the UI.
    - Make the images with `sharp` (from the repo's `node_modules`):
      - `big.jpg`: 6000×4000 random noise, so it's several MB;
      - `small.jpg`: 1000×750;
      - `rotated.jpg`: 3000×2000 with EXIF orientation 6;
      - `bird.heic`: any bytes, uploaded as `image/heic`.
    - `page.route('**/api/post', …)` captures the POST body and answers a fake `201 { ok: true, data: <post> }` after 1.5 s. **Nothing reaches the server.**
  - **Checks:**
    1. **`big.jpg`:** the "Preparing photo…" text, then a progress bar. The captured image part is `image/jpeg`, ≤ 4 MB, and 2400×1600 (read with `sharp(buffer).metadata()`). It has no EXIF GPS.
    2. **`small.jpg`:** captured at 1000×750.
    3. **`rotated.jpg`:** captured at 1600×2400. It's upright, so the stored dimensions are swapped.
    4. **`bird.heic`:** the format alert, and no request.
    5. **The route answers a bare 413 HTML page:** the "too large" alert, and the modal is still open with the caption.
  - **Clean up:** only the seeded user.

- [ ] **Step 4: Commit**
  ```bash
  git add CLAUDE.md
  git commit -m "docs(CLAUDE.md): document image uploads, the 413 code and the upload helpers"
  ```
