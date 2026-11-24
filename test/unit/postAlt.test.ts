import { describe, expect, it } from 'vitest'
import { postAlt } from '@/utils/postAlt'

describe('postAlt', () => {
  it('uses the trimmed caption', () => {
    expect(postAlt('  Manguito on the fridge  ')).toBe('Manguito on the fridge')
  })

  it('falls back for an empty or blank caption', () => {
    expect(postAlt('')).toBe('Photo of Manguito')
    expect(postAlt('   \n ')).toBe('Photo of Manguito')
  })

  it('cuts a long caption at a word boundary', () => {
    expect(postAlt('a'.repeat(30) + ' ' + 'b'.repeat(90))).toBe(
      'a'.repeat(30) + '…',
    )
  })

  it('keeps a long caption within 100 characters', () => {
    const alt = postAlt('word '.repeat(60))
    expect(alt.length).toBeLessThanOrEqual(100)
    expect(alt.endsWith('word…')).toBe(true)
  })

  it('folds line breaks into spaces', () => {
    expect(postAlt('on the\nfridge')).toBe('on the fridge')
  })

  it('keeps markup characters as text (Vue escapes them)', () => {
    expect(postAlt('<b>hi</b> & "you"')).toBe('<b>hi</b> & "you"')
  })
})
