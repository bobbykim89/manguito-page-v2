import { afterEach, describe, expect, it, vi } from 'vitest'
import { UPLOAD_MESSAGES } from '#shared/dto/limits'
import { UploadError } from '@/utils/fitImage'
import { prepareUpload } from '@/utils/prepareUpload'

describe('prepareUpload', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('refuses HEIC by type and by name', async () => {
    const decode = vi.fn()
    vi.stubGlobal('createImageBitmap', decode)
    for (const file of [
      new File(['x'], 'bird.jpg', { type: 'image/heic' }),
      new File(['x'], 'bird.HEIC', { type: '' }),
      new File(['x'], 'bird.heif', { type: 'image/heif' }),
    ]) {
      const attempt = prepareUpload(file)
      await expect(attempt).rejects.toBeInstanceOf(UploadError)
      await expect(attempt).rejects.toThrow(UPLOAD_MESSAGES.unreadable)
    }
    expect(decode).not.toHaveBeenCalled()
  })

  it('refuses over 50 MB', async () => {
    const decode = vi.fn()
    vi.stubGlobal('createImageBitmap', decode)
    const file = new File(['x'], 'bird.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 + 1 })
    await expect(prepareUpload(file)).rejects.toThrow(
      UPLOAD_MESSAGES.inputTooLarge,
    )
    expect(decode).not.toHaveBeenCalled()
  })

  it('an undecodable image gets the format message', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockRejectedValue(new Error('decode failed')),
    )
    const file = new File(['not an image'], 'bird.jpg', { type: 'image/jpeg' })
    await expect(prepareUpload(file)).rejects.toThrow(
      UPLOAD_MESSAGES.unreadable,
    )
  })

  it('draws each size once, with high-quality smoothing', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() }),
    )
    const canvases: Array<{ width: number; height: number }> = []
    const draws: string[] = []
    class FakeCanvas {
      constructor(
        public width: number,
        public height: number,
      ) {
        canvases.push({ width, height })
      }
      getContext() {
        const ctx = {
          fillStyle: '',
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'low',
          fillRect: () => {},
          drawImage: () => draws.push(ctx.imageSmoothingQuality),
        }
        return ctx
      }
      // over budget above 0.8, so the search runs several encodes at 2400×1800
      async convertToBlob({ quality }: { quality: number }) {
        return new Blob([new Uint8Array(quality > 0.8 ? 5 * 1024 * 1024 : 10)])
      }
    }
    vi.stubGlobal('OffscreenCanvas', FakeCanvas)
    const out = await prepareUpload(
      new File(['x'], 'bird.png', { type: 'image/png' }),
    )
    expect(out.name).toBe('bird.jpg')
    expect(out.type).toBe('image/jpeg')
    expect(canvases).toEqual([{ width: 2400, height: 1800 }])
    expect(draws).toEqual(['high'])
  })
})
