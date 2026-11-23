import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UPLOAD_MESSAGES } from '#shared/dto/limits'
import { ApiError } from '@/utils/apiError'
import { uploadWithProgress } from '@/utils/uploadWithProgress'
import { FakeXhr } from './fakeXhr'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('uploadWithProgress', () => {
  beforeEach(() => {
    FakeXhr.reset()
    vi.stubGlobal('XMLHttpRequest', FakeXhr)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('reports progress as a percentage', async () => {
    const seen: number[] = []
    const done = uploadWithProgress('/api/post', new FormData(), {
      onProgress: (p) => seen.push(p),
    })
    await tick()
    FakeXhr.last.progress(50, 200)
    FakeXhr.last.progress(200, 200)
    FakeXhr.last.respond(201, { ok: true, data: { id: 1 } })
    await done
    expect(seen).toEqual([25, 100])
  })

  it('resolves the data of an ok envelope', async () => {
    const done = uploadWithProgress('/api/post', new FormData(), {})
    await tick()
    expect(FakeXhr.last.method).toBe('POST')
    expect(FakeXhr.last.url).toBe('/api/post')
    FakeXhr.last.respond(201, { ok: true, data: { _id: 'p1' } })
    await expect(done).resolves.toEqual({ _id: 'p1' })
  })

  it("throws the envelope's error", async () => {
    const done = uploadWithProgress('/api/post', new FormData(), {})
    await tick()
    FakeXhr.last.respond(415, {
      ok: false,
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Please upload a JPEG, PNG or WebP image.',
      },
    })
    const err = await done.catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({
      status: 415,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Please upload a JPEG, PNG or WebP image.',
    })
  })

  it('turns a bare 413 into PAYLOAD_TOO_LARGE', async () => {
    const done = uploadWithProgress('/api/post', new FormData(), {})
    await tick()
    FakeXhr.last.respond(413, '<html>Request Entity Too Large</html>')
    await expect(done).rejects.toMatchObject({
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: UPLOAD_MESSAGES.tooLarge,
    })
  })

  it('a network error is unreachable', async () => {
    const done = uploadWithProgress('/api/post', new FormData(), {})
    await tick()
    FakeXhr.last.fail()
    await expect(done).rejects.toMatchObject({
      status: 0,
      message: 'Could not reach the server, please try again.',
    })
  })

  it('sends the session token', async () => {
    const done = uploadWithProgress('/api/post', new FormData(), {
      token: 'Bearer x',
    })
    await tick()
    expect(FakeXhr.last.headers.Authorization).toBe('Bearer x')
    FakeXhr.last.respond(201, { ok: true, data: null })
    await done
  })
})
