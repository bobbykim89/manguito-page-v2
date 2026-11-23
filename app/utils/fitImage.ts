import { UPLOAD_BUDGET, UPLOAD_MESSAGES } from '#shared/dto/limits'

export { UPLOAD_BUDGET }

/** The stored photo's long edge, at most (the owner's choice). */
export const MAX_EDGE = 2400
export const QUALITY_MAX = 0.92
export const QUALITY_MIN = 0.6
/** How much the dimensions shrink when even QUALITY_MIN doesn't fit. */
export const SHRINK = 0.85
/** Below this long edge it gives up (unreachable for real photos). */
export const MIN_EDGE = 600
/** Bigger inputs are refused before decoding. */
export const MAX_INPUT_BYTES = 50 * 1024 * 1024

/** A problem with the picked photo; its message is shown to the person. */
export class UploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UploadError'
  }
}

/** Encodes the image at this size and JPEG quality. */
export type Encode = (
  width: number,
  height: number,
  quality: number,
) => Promise<Blob>

export type Fitted = {
  blob: Blob
  width: number
  height: number
  quality: number
}

const SEARCH_STEPS = 5

/**
 * The best-quality encoding under the upload budget: the long edge capped at
 * MAX_EDGE (never upscaled), then the highest JPEG quality between
 * QUALITY_MIN and QUALITY_MAX that fits. Only when even QUALITY_MIN doesn't
 * fit do the dimensions shrink, by SHRINK at a time.
 */
export const fitImage = async (
  width: number,
  height: number,
  encode: Encode,
): Promise<Fitted> => {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  let w = Math.round(width * scale)
  let h = Math.round(height * scale)

  while (Math.max(w, h) >= MIN_EDGE) {
    const top = await encode(w, h, QUALITY_MAX)
    if (top.size <= UPLOAD_BUDGET)
      return { blob: top, width: w, height: h, quality: QUALITY_MAX }

    const bottom = await encode(w, h, QUALITY_MIN)
    if (bottom.size <= UPLOAD_BUDGET) {
      // QUALITY_MIN fits and QUALITY_MAX doesn't: find the highest that fits
      let best: Fitted = {
        blob: bottom,
        width: w,
        height: h,
        quality: QUALITY_MIN,
      }
      let lo = QUALITY_MIN
      let hi = QUALITY_MAX
      for (let step = 0; step < SEARCH_STEPS; step++) {
        const q = (lo + hi) / 2
        const blob = await encode(w, h, q)
        if (blob.size <= UPLOAD_BUDGET) {
          best = { blob, width: w, height: h, quality: q }
          lo = q
        } else {
          hi = q
        }
      }
      return best
    }

    w = Math.round(w * SHRINK)
    h = Math.round(h * SHRINK)
  }
  throw new UploadError(UPLOAD_MESSAGES.tooLarge)
}
