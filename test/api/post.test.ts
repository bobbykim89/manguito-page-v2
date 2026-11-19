import { describe, expect, it } from 'vitest'
import { api } from '../utils/api'

describe('GET /api/post', () => {
  it('returns an empty list from an empty database', async () => {
    const res = await api('GET', '/api/post')
    expect(res.status).toBe(200)
    expect(res.json).toEqual([])
  })
})
