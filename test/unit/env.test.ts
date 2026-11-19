import { describe, expect, it } from 'vitest'

describe('unit test environment', () => {
  it('loads test/test.env, never the developer .env', () => {
    expect(useRuntimeConfig().public.cloudinarySourceUrl).toBe(
      'https://res.cloudinary.test/',
    )
  })
})
