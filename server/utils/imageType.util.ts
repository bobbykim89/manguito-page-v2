export type ImageType = 'image/jpeg' | 'image/png' | 'image/webp'

const startsWith = (bytes: Uint8Array, at: number, sig: number[]) =>
  sig.every((b, i) => bytes[at + i] === b)
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0))

/**
 * An image's real type, read from its first bytes (a declared type is only
 * the client's word). Null for anything that isn't a JPEG, PNG or WebP.
 */
export const detectImageType = (bytes: Uint8Array): ImageType | null => {
  if (startsWith(bytes, 0, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return 'image/png'
  if (
    startsWith(bytes, 0, ascii('RIFF')) &&
    startsWith(bytes, 8, ascii('WEBP'))
  )
    return 'image/webp'
  return null
}
