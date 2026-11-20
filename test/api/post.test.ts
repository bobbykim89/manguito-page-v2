import { beforeEach, describe, expect, it } from 'vitest'
import { api } from '../utils/api'
import { clearContent } from '../utils/content'

beforeEach(clearContent)

describe('GET /api/post', () => {
  it('returns an empty list from an empty database', async () => {
    const res = await api('GET', '/api/post')
    expect(res.status).toBe(200)
    expect(res.json).toEqual([])
  })
})
