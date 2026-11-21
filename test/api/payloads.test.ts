import { describe, expect, it } from 'vitest'
import { api } from '../utils/api'
import { insertUser, signup } from '../utils/auth'
import { insertComment, insertPost } from '../utils/content'

describe('success payloads', () => {
  it('signup answers 201 with only an access token', async () => {
    const res = await api('POST', '/api/user', {
      body: {
        name: `n-${Date.now()}`,
        email: `s-${Date.now()}@example.test`,
        password: 'Passw0rd!',
      },
    })
    expect(res.status).toBe(201)
    expect(Object.keys(res.json.data)).toEqual(['accessToken'])
    expect(res.json.data.accessToken).toMatch(/^Bearer /)
  })

  it('login answers only an access token', async () => {
    const u = await signup()
    const res = await api('POST', '/api/auth', {
      body: { email: u.email, password: u.password },
    })
    expect(res.status).toBe(200)
    expect(Object.keys(res.json.data)).toEqual(['accessToken'])
    expect(res.json.data.accessToken).toMatch(/^Bearer /)
  })

  it('a password change answers null', async () => {
    const u = await signup()
    const res = await api('PUT', '/api/user/user-info/password', {
      token: u.token,
      body: { currentPassword: u.password, newPassword: 'N3wPassw0rd!' },
    })
    expect(res.status).toBe(200)
    expect(res.json).toEqual({ ok: true, data: null })
  })

  it('deleting a post answers its id', async () => {
    const author = await insertUser('MANAGER')
    const postId = await insertPost(author.id)
    const res = await api('DELETE', `/api/post/${postId}`, {
      token: author.token,
    })
    expect(res.json).toEqual({ ok: true, data: { id: postId } })
  })

  it('deleting a comment answers its id', async () => {
    const postAuthor = await insertUser('MANAGER')
    const author = await insertUser('USER')
    const postId = await insertPost(postAuthor.id)
    const commentId = await insertComment(author.id, postId)
    const res = await api('DELETE', `/api/comment/${commentId}`, {
      token: author.token,
    })
    expect(res.json).toEqual({ ok: true, data: { id: commentId } })
  })

  it('creating a comment answers 201 with the comment', async () => {
    const postAuthor = await insertUser('MANAGER')
    const user = await insertUser('USER')
    const postId = await insertPost(postAuthor.id)
    const res = await api('POST', `/api/comment/${postId}`, {
      token: user.token,
      body: { text: 'hi' },
    })
    expect(res.status).toBe(201)
    expect(res.json.data.text).toBe('hi')
  })
})
