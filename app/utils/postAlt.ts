const FALLBACK = 'Photo of Manguito'
const MAX = 100

/**
 * The alt text for a post's photo: its caption on one line, cut at a word
 * boundary to at most 100 characters, or a fallback when it's blank. Links to
 * a post are named by it, so a screen reader hears what the photo is about.
 */
export const postAlt = (caption: string): string => {
  const text = caption.replace(/\s+/g, ' ').trim()
  if (!text) return FALLBACK
  if (text.length <= MAX) return text
  const cut = text.slice(0, MAX - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}…`
}
