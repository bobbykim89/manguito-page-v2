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
})
