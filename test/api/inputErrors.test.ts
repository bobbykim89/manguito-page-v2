import mongoose from 'mongoose'
import { beforeEach, describe, expect, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { insertUser, signup } from '../utils/auth'
import { db } from '../utils/db'
import { cloudinaryCalls, resetFakes } from '../utils/fakes'

const BAD_ID = 'That id is not valid.'
const RESET_LINK = 'This reset link is invalid or has expired.'
const newId = () => new mongoose.Types.ObjectId().toString()

// a 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

const form = (parts: { image?: 'png' | 'text'; content?: boolean }) => {
  const f = new FormData()
  if (parts.image === 'png')
    f.append('image', new Blob([PNG], { type: 'image/png' }), 'bird.png')
  if (parts.image === 'text')
    f.append('image', new Blob(['hi'], { type: 'text/plain' }), 'bird.txt')
  if (parts.content) f.append('content', 'Manguito says hi')
  return f
}

const uploads = async () =>
  (await cloudinaryCalls()).filter((c) => c.path.endsWith('/image/upload'))

beforeEach(resetFakes)

describe('invalid ids: 400 VALIDATION_FAILED', () => {
  it('reading comments of a bad post id', async () => {
    expectApiError(
      await api('GET', '/api/comment/not-an-id'),
      'VALIDATION_FAILED',
      BAD_ID,
    )
  })

  it('commenting on a bad post id stores nothing', async () => {
    const { token } = await insertUser('USER')
    const text = `bad-id-${Date.now()}`
    const res = await api('POST', '/api/comment/not-an-id', {
      token,
      body: { text },
    })
    expectApiError(res, 'VALIDATION_FAILED', BAD_ID)
    const conn = await db()
    expect(
      await conn.connection.collection('comments').countDocuments({ text }),
    ).toBe(0)
  })

  it.each([
    ['DELETE', '/api/post/not-an-id', 'ADMIN', undefined],
    ['PUT', '/api/post/not-an-id', 'MANAGER', { content: 'x' }],
    ['DELETE', '/api/comment/not-an-id', 'ADMIN', undefined],
    ['PUT', '/api/user/admin/not-an-id', 'ADMIN', { role: 'USER' }],
  ] as const)('%s %s', async (method, path, role, body) => {
    const { token } = await insertUser(role)
    expectApiError(
      await api(method, path, { token, body }),
      'VALIDATION_FAILED',
      BAD_ID,
    )
  })

  it('checks the id before the body', async () => {
    const { token } = await insertUser('MANAGER')
    const res = await api('PUT', '/api/post/not-an-id', { token, body: {} })
    expectApiError(res, 'VALIDATION_FAILED', BAD_ID)
  })

  it('a reset with a bad user id reads as a bad link', async () => {
    const res = await api('POST', '/api/token/reset-password', {
      body: { userId: 'not-an-id', token: 'x', password: 'NewPassw0rd!' },
    })
    expectApiError(res, 'VALIDATION_FAILED', RESET_LINK)
  })
})

describe('not found: 404 NOT_FOUND', () => {
  it('deleting a post that does not exist', async () => {
    const { token } = await insertUser('ADMIN')
    expectApiError(
      await api('DELETE', `/api/post/${newId()}`, { token }),
      'NOT_FOUND',
    )
  })

  it('setting the role of a user that does not exist', async () => {
    const { token } = await insertUser('ADMIN')
    const res = await api('PUT', `/api/user/admin/${newId()}`, {
      token,
      body: { role: 'USER' },
    })
    expectApiError(res, 'NOT_FOUND')
  })
})

describe('taken values: 409 CONFLICT', () => {
  it('signing up with a taken email', async () => {
    const u = await signup()
    const res = await api('POST', '/api/user', {
      body: {
        name: `other-${Date.now()}`,
        email: u.email,
        password: u.password,
      },
    })
    expectApiError(res, 'CONFLICT')
  })

  it('signing up with a taken name', async () => {
    const u = await signup()
    const res = await api('POST', '/api/user', {
      body: {
        name: u.name,
        email: `other-${Date.now()}@example.test`,
        password: u.password,
      },
    })
    expectApiError(res, 'CONFLICT')
  })

  it('renaming to a taken name', async () => {
    const taken = await signup()
    const u = await signup()
    const res = await api('PUT', '/api/user/user-info/username', {
      token: u.token,
      body: { username: taken.name },
    })
    expectApiError(res, 'CONFLICT')
  })
})

describe('new post uploads', () => {
  it('without an image: 400 and no upload', async () => {
    const { token } = await insertUser('MANAGER')
    const res = await api('POST', '/api/post', {
      token,
      raw: form({ content: true }),
    })
    expectApiError(res, 'VALIDATION_FAILED', 'File not found')
    expect(await uploads()).toHaveLength(0)
  })

  it('without content: 400 and no upload', async () => {
    const { token } = await insertUser('MANAGER')
    const res = await api('POST', '/api/post', {
      token,
      raw: form({ image: 'png' }),
    })
    expectApiError(res, 'VALIDATION_FAILED', 'Content field not found')
    expect(await uploads()).toHaveLength(0)
  })

  it('with an empty caption: 400 and no upload', async () => {
    const { token } = await insertUser('MANAGER')
    const f = form({ image: 'png' })
    f.append('content', '   ')
    const res = await api('POST', '/api/post', { token, raw: f })
    expectApiError(res, 'VALIDATION_FAILED', 'Please write a caption.')
    expect(await uploads()).toHaveLength(0)
  })

  it('with a file that is not png or jpeg: 415 and no upload', async () => {
    const { token } = await insertUser('MANAGER')
    const res = await api('POST', '/api/post', {
      token,
      raw: form({ image: 'text', content: true }),
    })
    expectApiError(res, 'UNSUPPORTED_MEDIA_TYPE')
    expect(await uploads()).toHaveLength(0)
  })

  it('with a JSON body: 400', async () => {
    const { token } = await insertUser('MANAGER')
    const res = await api('POST', '/api/post', {
      token,
      body: { content: 'x' },
    })
    expectApiError(res, 'VALIDATION_FAILED')
  })

  it('with an image and content: 201', async () => {
    // guards the reorder: content is read before the image is uploaded
    const { token } = await insertUser('MANAGER')
    const res = await api('POST', '/api/post', {
      token,
      raw: form({ image: 'png', content: true }),
    })
    expect(res.status).toBe(201)
    expect(res.json.data.content).toBe('Manguito says hi')
  })
})

describe('unreadable bodies', () => {
  it('answers malformed JSON with a sentence', async () => {
    const res = await api('POST', '/api/auth', {
      raw: '{bad',
      headers: { 'content-type': 'application/json' },
    })
    expectApiError(res, 'VALIDATION_FAILED', 'The request could not be read.')
  })
})
