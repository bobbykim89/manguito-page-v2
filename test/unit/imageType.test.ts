import { describe, expect, it } from 'vitest'
import { detectImageType } from '../../server/utils/imageType.util'

const bytes = (...parts: Array<number[] | string>) =>
  new Uint8Array(
    parts.flatMap((p) =>
      typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p,
    ),
  )

describe('detectImageType', () => {
  it('recognises JPEG, PNG and WebP by their first bytes', () => {
    expect(detectImageType(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe(
      'image/jpeg',
    )
    expect(
      detectImageType(
        bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]),
      ),
    ).toBe('image/png')
    expect(detectImageType(bytes('RIFF', [1, 2, 3, 4], 'WEBPVP8 '))).toBe(
      'image/webp',
    )
  })

  it('rejects anything else', () => {
    expect(detectImageType(bytes('hi'))).toBeNull()
    expect(detectImageType(new Uint8Array())).toBeNull()
    expect(detectImageType(bytes('RIFF', [1, 2, 3, 4], 'WAVEfmt '))).toBeNull()
  })
})
