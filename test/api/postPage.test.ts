import { beforeEach, describe, expect, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { insertUser } from '../utils/auth'
import { db } from '../utils/db'
import { clearContent, insertPosts } from '../utils/content'
import mongoose from 'mongoose'

beforeEach(clearContent)

const author = async () => (await insertUser('MANAGER')).id
const page = (query = '') => api('GET', `/api/post${query}`)
const idsOf = (res: Awaited<ReturnType<typeof page>>): string[] =>
  res.json.data.posts.map((post: { _id: string }) => post._id)

describe('GET /api/post paging', () => {
  it('returns an empty page from an empty database', async () => {
    const res = await page()
    expect(res.status).toBe(200)
    expect(res.json.data).toEqual({ posts: [], nextCursor: null })
  })

  it('returns the 30 newest first with a cursor when more exist', async () => {
    const ids = await insertPosts(await author(), 31)
    const res = await page()
    expect(idsOf(res)).toEqual(ids.slice(0, 30))
    expect(typeof res.json.data.nextCursor).toBe('string')
  })

  it('continues from the cursor without overlap', async () => {
    const ids = await insertPosts(await author(), 31)
    const first = await page()
    const second = await page(`?cursor=${first.json.data.nextCursor}`)
    expect(idsOf(second)).toEqual([ids[30]])
    expect(second.json.data.nextCursor).toBeNull()
  })

  it('gives exactly 30 posts one page', async () => {
    await insertPosts(await author(), 30)
    const res = await page()
    expect(res.json.data.posts).toHaveLength(30)
    expect(res.json.data.nextCursor).toBeNull()
  })

  it('honours limit', async () => {
    await insertPosts(await author(), 10)
    const res = await page('?limit=7')
    expect(res.json.data.posts).toHaveLength(7)
    expect(typeof res.json.data.nextCursor).toBe('string')
  })

  it('pages ties on date by _id', async () => {
    const ids = await insertPosts(await author(), 5, {
      date: new Date('2026-11-01T00:00:00Z'),
      sameDate: true,
    })
    const seen: string[] = []
    let cursor: string | null = null
    do {
      const res = await page(`?limit=2${cursor ? `&cursor=${cursor}` : ''}`)
      seen.push(...idsOf(res))
      cursor = res.json.data.nextCursor
    } while (cursor)
    expect(seen).toEqual(ids)
  })

  it('skips posts created after the first page', async () => {
    const id = await author()
    const ids = await insertPosts(id, 31, {
      date: new Date(Date.now() - 60_000),
    })
    const first = await page()
    await insertPosts(id, 1)
    const second = await page(`?cursor=${first.json.data.nextCursor}`)
    expect(idsOf(second)).toEqual([ids[30]])
    expect(new Set([...idsOf(first), ...idsOf(second)]).size).toBe(31)
  })

  it("survives deleting the cursor's post", async () => {
    const ids = await insertPosts(await author(), 31)
    const first = await page()
    const conn = await db()
    await conn.connection
      .collection('posts')
      .deleteOne({ _id: new mongoose.Types.ObjectId(ids[29]) })
    const second = await page(`?cursor=${first.json.data.nextCursor}`)
    expect(idsOf(second)).toEqual([ids[30]])
  })

  it.each(['0', '51', 'abc'])('refuses a bad limit (%s)', async (limit) => {
    const res = await page(`?limit=${limit}`)
    expectApiError(res, 'VALIDATION_FAILED')
    expect(res.json.error.details[0].message).toBe(
      'Please ask for between 1 and 50 posts.',
    )
  })

  it('refuses a malformed cursor', async () => {
    const res = await page('?cursor=nope')
    expectApiError(res, 'VALIDATION_FAILED')
    expect(res.json.error.details[0].message).toBe(
      "This list position isn't valid, please reload the page.",
    )
  })
})
