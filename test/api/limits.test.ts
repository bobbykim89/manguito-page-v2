import { beforeEach, describe, expect, it } from 'vitest'
import { api, type ApiResult, expectApiError } from '../utils/api'
import { insertUser } from '../utils/auth'
import { insertPost } from '../utils/content'
import { cloudinaryCalls, resetFakes } from '../utils/fakes'

// a 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

const newPost = (token: string, content: string) => {
  const form = new FormData()
  form.append('image', new Blob([PNG], { type: 'image/png' }), 'bird.png')
  form.append('content', content)
  return api('POST', '/api/post', { token, raw: form })
}

const expectDetail = (res: ApiResult, path: string, message: string) => {
  expectApiError(res, 'VALIDATION_FAILED')
  expect(res.json.error.details).toContainEqual({ path, message })
}

const CAPTION_LONG = 'Captions can be at most 1000 characters.'
const COMMENT_LONG = 'Comments can be at most 500 characters.'
const USERNAME_LONG = 'Usernames can be at most 30 characters.'

beforeEach(resetFakes)

describe('length limits', () => {
  it('refuses a caption over 1000 characters on create', async () => {
    const { token } = await insertUser('MANAGER')
    const res = await newPost(token, 'x'.repeat(1001))
    expectApiError(res, 'VALIDATION_FAILED', CAPTION_LONG)
    const uploads = (await cloudinaryCalls()).filter((c) =>
      c.path.endsWith('/image/upload'),
    )
    expect(uploads).toHaveLength(0)
  })

  it('accepts a caption of exactly 1000 characters', async () => {
    const { token } = await insertUser('MANAGER')
    const res = await newPost(token, 'x'.repeat(1000))
    expect(res.status).toBe(201)
  })

  it('refuses an over-long or blank caption update', async () => {
    const author = await insertUser('MANAGER')
    const postId = await insertPost(author.id)
    const long = await api('PUT', `/api/post/${postId}`, {
      token: author.token,
      body: { content: 'x'.repeat(1001) },
    })
    expectDetail(long, 'content', CAPTION_LONG)
    const blank = await api('PUT', `/api/post/${postId}`, {
      token: author.token,
      body: { content: '   ' },
    })
    expectDetail(blank, 'content', 'Please write a caption.')
  })

  it('refuses an over-long or blank comment', async () => {
    const author = await insertUser('MANAGER')
    const postId = await insertPost(author.id)
    const { token } = await insertUser()
    const long = await api('POST', `/api/comment/${postId}`, {
      token,
      body: { text: 'x'.repeat(501) },
    })
    expectDetail(long, 'text', COMMENT_LONG)
    const blank = await api('POST', `/api/comment/${postId}`, {
      token,
      body: { text: '  ' },
    })
    expectDetail(blank, 'text', 'Please write a comment.')
  })

  it('refuses an over-long or blank username at signup and on update', async () => {
    const signup = await api('POST', '/api/user', {
      body: {
        name: 'n'.repeat(31),
        email: `long-name-${Date.now()}@example.test`,
        password: 'Passw0rd!',
      },
    })
    expectDetail(signup, 'name', USERNAME_LONG)
    const { token } = await insertUser()
    const long = await api('PUT', '/api/user/user-info/username', {
      token,
      body: { username: 'n'.repeat(31) },
    })
    expectDetail(long, 'username', USERNAME_LONG)
    const blank = await api('PUT', '/api/user/user-info/username', {
      token,
      body: { username: ' ' },
    })
    expectDetail(blank, 'username', 'Please enter a username.')
  })

  it('refuses an email over 254 characters', async () => {
    const res = await api('POST', '/api/user', {
      body: {
        name: `e-${Date.now()}`,
        email: `${'a'.repeat(250)}@x.io`,
        password: 'Passw0rd!',
      },
    })
    expectDetail(res, 'email', 'Email addresses can be at most 254 characters.')
  })
})
