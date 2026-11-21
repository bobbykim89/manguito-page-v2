import { beforeEach, describe, expect, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { insertUser } from '../utils/auth'
import { db } from '../utils/db'
import { failNext, resetFakes } from '../utils/fakes'

// a 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

const postCount = async () =>
  (await db()).connection.collection('posts').countDocuments()

beforeEach(resetFakes)

describe('upstream failures: 502 UPSTREAM_FAILED', () => {
  it('Cloudinary refusing the upload creates no post', async () => {
    const { token } = await insertUser('MANAGER')
    const form = new FormData()
    form.append('image', new Blob([PNG], { type: 'image/png' }), 'bird.png')
    form.append('content', 'Manguito says hi')
    const before = await postCount()
    await failNext('cloudinary')
    const res = await api('POST', '/api/post', { token, raw: form })
    expectApiError(
      res,
      'UPSTREAM_FAILED',
      'Could not upload the image, please try again.',
    )
    expect(await postCount()).toBe(before)
  })

  it('the mail server refusing the reset email', async () => {
    const { email } = await insertUser()
    await failNext('mail')
    const res = await api('POST', '/api/token/send-token', { body: { email } })
    expectApiError(
      res,
      'UPSTREAM_FAILED',
      'Failed to send email, please try again',
    )
  })
})
