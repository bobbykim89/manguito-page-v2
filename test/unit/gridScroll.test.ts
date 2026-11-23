import { describe, expect, it } from 'vitest'
import { isGridPath, isPostPath, scrollTarget } from '@/utils/gridScroll'

const to = (path: string, hash = '') => ({ path, hash })
const from = (path: string) => ({ path })

describe('scrollTarget', () => {
  it('a saved position wins', () => {
    expect(
      scrollTarget(to('/posts'), from('/posts/a'), { left: 0, top: 50 }, 900),
    ).toEqual({ left: 0, top: 50 })
  })

  it('post → grid returns the remembered offset', () => {
    expect(scrollTarget(to('/posts'), from('/posts/a'), null, 900)).toEqual({
      left: 0,
      top: 900,
    })
  })

  it('post → grid with no remembered offset goes to the top', () => {
    expect(scrollTarget(to('/posts'), from('/posts/a'), null, null)).toEqual({
      left: 0,
      top: 0,
    })
  })

  it('another page → grid goes to the top', () => {
    expect(scrollTarget(to('/posts'), from('/about'), null, 900)).toEqual({
      left: 0,
      top: 0,
    })
  })

  it('a hash scrolls to its element', () => {
    expect(scrollTarget(to('/about', '#team'), from('/'), null, null)).toEqual({
      el: '#team',
    })
  })
})

describe('isPostPath', () => {
  it('matches a post page only', () => {
    expect(isPostPath('/posts/abc')).toBe(true)
    expect(isPostPath('/posts')).toBe(false)
    expect(isPostPath('/posts/')).toBe(false)
    expect(isPostPath('/admin/posts')).toBe(false)
  })
})

describe('isGridPath', () => {
  it('matches the grid only', () => {
    expect(isGridPath('/posts')).toBe(true)
    expect(isGridPath('/posts/')).toBe(true)
    expect(isGridPath('/posts/abc')).toBe(false)
    expect(isGridPath('/admin/posts')).toBe(false)
  })
})
