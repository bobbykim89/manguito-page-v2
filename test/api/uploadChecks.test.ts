import { beforeEach, describe, expect, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { insertUser } from '../utils/auth'
import { cloudinaryCalls, resetFakes } from '../utils/fakes'

// the server judges a file by its leading signature bytes, so these stand in
// for real images (the fake Cloudinary accepts any bytes)
const sig = (...parts: Array<number[] | string>) =>
  Buffer.from(
    parts.flatMap((p) =>
      typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p,
    ),
  )
const JPEG = sig([0xff, 0xd8, 0xff, 0xe0], 'jpeg-body')
const PNG = sig([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'png-body')
const WEBP = sig('RIFF', [1, 2, 3, 4], 'WEBPVP8 body')

const form = (data: Buffer | string, type: string, name = 'bird.jpg') => {
  const f = new FormData()
  f.append('image', new Blob([data], { type }), name)
  f.append('content', 'Manguito says hi')
  return f
}
const uploads = async () =>
  (await cloudinaryCalls()).filter((c) => c.path.endsWith('/image/upload'))
const post = async (raw: FormData) => {
  const { token } = await insertUser('MANAGER')
  return api('POST', '/api/post', { token, raw })
}

beforeEach(resetFakes)

describe('new post file checks', () => {
  it.each([
    ['a JPEG', JPEG, 'image/jpeg'],
    ['a PNG', PNG, 'image/png'],
    ['a WebP', WEBP, 'image/webp'],
  ])('accepts %s', async (_name, data, type) => {
    const res = await post(form(data, type))
    expect(res.status).toBe(201)
    expect(await uploads()).toHaveLength(1)
  })

  it('judges the type by the bytes, not the declared type', async () => {
    const res = await post(form(JPEG, 'image/png', 'bird.png'))
    expect(res.status).toBe(201)
    expect(await uploads()).toHaveLength(1)
  })

  it('refuses a text file declared as a JPEG', async () => {
    const res = await post(form('hi', 'image/jpeg'))
    expectApiError(
      res,
      'UNSUPPORTED_MEDIA_TYPE',
      'Please upload a JPEG, PNG or WebP image.',
    )
    expect(await uploads()).toHaveLength(0)
  })

  it('refuses a file over 4 MB', async () => {
    const big = Buffer.alloc(4 * 1024 * 1024 + 1)
    JPEG.copy(big)
    const res = await post(form(big, 'image/jpeg'))
    expectApiError(
      res,
      'PAYLOAD_TOO_LARGE',
      'This photo is too large to upload. Please choose a smaller one.',
    )
    expect(await uploads()).toHaveLength(0)
  })

  it('refuses an empty file', async () => {
    const res = await post(form(Buffer.alloc(0), 'image/jpeg'))
    expectApiError(res, 'VALIDATION_FAILED', 'Please choose a photo to upload.')
    expect(await uploads()).toHaveLength(0)
  })
})
