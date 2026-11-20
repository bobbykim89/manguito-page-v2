import { beforeEach, describe, expect, it } from 'vitest'
import { api } from '../utils/api'
import { insertUser } from '../utils/auth'
import { cloudinaryCalls, resetFakes } from '../utils/fakes'

// a 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

const newPostForm = () => {
  const form = new FormData()
  form.append('image', new Blob([PNG], { type: 'image/png' }), 'bird.png')
  form.append('content', 'Manguito says hi')
  return form
}

const uploads = async () =>
  (await cloudinaryCalls()).filter((c) => c.path.endsWith('/image/upload'))

beforeEach(resetFakes)

describe('POST /api/post', () => {
  it('a user cannot create a post and nothing is uploaded', async () => {
    const { token } = await insertUser('USER')
    const res = await api('POST', '/api/post', { token, raw: newPostForm() })
    expect(res.status).toBe(401)
    expect(await uploads()).toHaveLength(0)
  })

  it('a manager creates a post', async () => {
    const { token } = await insertUser('MANAGER')
    const res = await api('POST', '/api/post', { token, raw: newPostForm() })
    expect(res.status).toBe(200)
    expect(res.json.imageId).toBe('fake-folder/fake-id')
    expect(res.json.content).toBe('Manguito says hi')
    expect(await uploads()).toHaveLength(1)
  })
})
