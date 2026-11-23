import { describe, expect, it } from 'vitest'
import { UPLOAD_BUDGET, UPLOAD_MESSAGES } from '#shared/dto/limits'
import { type Encode, fitImage, UploadError } from '@/utils/fitImage'

/** A fake encoder whose output weighs w × h × quality × k bytes. */
const encoder = (k: number) => {
  const calls: Array<{ w: number; h: number; q: number }> = []
  const encode: Encode = async (w, h, q) => {
    calls.push({ w, h, q })
    // only the size matters to the search; a real Blob this big would take
    // gigabytes to allocate
    return { size: Math.round(w * h * q * k) } as Blob
  }
  return { encode, calls }
}

describe('fitImage', () => {
  it("keeps a small photo's size at the top quality", async () => {
    const { encode, calls } = encoder(1)
    const out = await fitImage(1200, 900, encode)
    expect(out).toMatchObject({ width: 1200, height: 900, quality: 0.92 })
    expect(calls).toHaveLength(1)
  })

  it('caps the long edge at 2400', async () => {
    const out = await fitImage(4000, 3000, encoder(1).encode)
    expect([out.width, out.height]).toEqual([2400, 1800])
  })

  it('caps the long edge of a portrait', async () => {
    const out = await fitImage(1000, 5000, encoder(1).encode)
    expect([out.width, out.height]).toEqual([480, 2400])
  })

  it('never upscales', async () => {
    const out = await fitImage(800, 600, encoder(1).encode)
    expect([out.width, out.height]).toEqual([800, 600])
  })

  it('keeps the highest quality that fits', async () => {
    // 0.92 is over budget at 2400×1800, 0.6 is under
    const k = 1.5
    const out = await fitImage(2400, 1800, encoder(k).encode)
    const best = UPLOAD_BUDGET / (2400 * 1800 * k)
    expect([out.width, out.height]).toEqual([2400, 1800])
    expect(out.blob.size).toBeLessThanOrEqual(UPLOAD_BUDGET)
    expect(out.quality).toBeLessThanOrEqual(best)
    expect(out.quality).toBeGreaterThan(best - 0.02)
  })

  it('shrinks only when the lowest quality does not fit', async () => {
    const { encode, calls } = encoder(2.5)
    const out = await fitImage(2400, 1800, encode)
    expect(out.width).toBeLessThan(2400)
    expect(out.blob.size).toBeLessThanOrEqual(UPLOAD_BUDGET)
    const atFullSize = calls.filter((c) => c.w === 2400)
    expect(atFullSize.map((c) => c.q)).toEqual([0.92, 0.6])
  })

  it('gives up below 600 px', async () => {
    const attempt = fitImage(2400, 1800, encoder(1000).encode)
    await expect(attempt).rejects.toBeInstanceOf(UploadError)
    await expect(attempt).rejects.toThrow(UPLOAD_MESSAGES.tooLarge)
  })

  it('stays within a bounded number of encodes per size', async () => {
    const { encode, calls } = encoder(2.5)
    await fitImage(2400, 1800, encode)
    const perSize = new Map<number, number>()
    for (const c of calls) perSize.set(c.w, (perSize.get(c.w) ?? 0) + 1)
    for (const count of perSize.values()) expect(count).toBeLessThanOrEqual(7)
  })

  it('keeps a photo under 600 px as it is', async () => {
    const { encode, calls } = encoder(1)
    const out = await fitImage(400, 300, encode)
    expect(out).toMatchObject({ width: 400, height: 300, quality: 0.92 })
    expect(calls).toHaveLength(1)
  })
})
