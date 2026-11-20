import { beforeEach, describe, expect, it } from 'vitest'
import { api } from '../utils/api'
import { insertUser } from '../utils/auth'
import { clearContent, insertPost } from '../utils/content'

beforeEach(clearContent)

describe('GET /api/post', () => {
  it('returns an empty list from an empty database', async () => {
    const res = await api('GET', '/api/post')
    expect(res.status).toBe(200)
    expect(res.json).toEqual([])
  })
})

describe('author fields', () => {
  it('lists posts without author emails', async () => {
    const { id } = await insertUser('MANAGER')
    await insertPost(id)
    const res = await api('GET', '/api/post')
    expect(res.status).toBe(200)
    expect(Object.keys(res.json[0].author).sort()).toEqual(['_id', 'name'])
  })

  it('lists trimmed posts with no author at all', async () => {
    const { id } = await insertUser('MANAGER')
    await insertPost(id)
    const res = await api('GET', '/api/post/trimmed')
    expect(res.status).toBe(200)
    expect(Object.keys(res.json[0]).sort()).toEqual(['_id', 'imageId'])
  })
})
