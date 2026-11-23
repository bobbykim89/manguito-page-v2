import { UPLOAD_MESSAGES } from '#shared/dto/limits'
import { fitImage, MAX_INPUT_BYTES, UploadError } from './fitImage'

const HEIC = /\.(heic|heif)$/i

/** A canvas to draw on: OffscreenCanvas where there is one, else a DOM canvas. */
const makeCanvas = (width: number, height: number) => {
  if (typeof OffscreenCanvas !== 'undefined')
    return new OffscreenCanvas(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

const toJpeg = (
  canvas: OffscreenCanvas | HTMLCanvasElement,
  quality: number,
): Promise<Blob> => {
  if ('convertToBlob' in canvas)
    return canvas.convertToBlob({ type: 'image/jpeg', quality })
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new UploadError(UPLOAD_MESSAGES.unreadable)),
      'image/jpeg',
      quality,
    ),
  )
}

/**
 * Turns a picked photo into the file to upload: always a freshly encoded
 * JPEG (so location data and other EXIF are dropped, and a phone's rotation
 * is applied), at most 2400 px on its long side, at the best quality under
 * the upload budget. Browser only. Throws UploadError with a message for the
 * person.
 */
export const prepareUpload = async (file: File): Promise<File> => {
  if (/^image\/hei[cf]$/i.test(file.type) || HEIC.test(file.name))
    throw new UploadError(UPLOAD_MESSAGES.unreadable)
  if (file.size > MAX_INPUT_BYTES)
    throw new UploadError(UPLOAD_MESSAGES.inputTooLarge)

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new UploadError(UPLOAD_MESSAGES.unreadable)
  }

  // one canvas per size, drawn once and re-encoded at each quality: fewer
  // full-size canvases alive at once (iOS Safari caps their total memory)
  let drawn: {
    width: number
    height: number
    canvas: OffscreenCanvas | HTMLCanvasElement
  } | null = null
  const draw = (width: number, height: number) => {
    if (drawn && drawn.width === width && drawn.height === height)
      return drawn.canvas
    const canvas = makeCanvas(width, height)
    const ctx = canvas.getContext('2d') as
      CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
    if (!ctx) throw new UploadError(UPLOAD_MESSAGES.unreadable)
    // JPEG has no transparency: a white background, not black
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    // the default ('low') aliases a big downscale, e.g. 6000 → 2400 px
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)
    drawn = { width, height, canvas }
    return canvas
  }

  try {
    const { blob } = await fitImage(
      bitmap.width,
      bitmap.height,
      (width, height, quality) => toJpeg(draw(width, height), quality),
    )
    const base = file.name.replace(/\.[^.]*$/, '') || 'photo'
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}
