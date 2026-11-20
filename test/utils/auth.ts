import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { db } from './db'

type Role = 'ADMIN' | 'MANAGER' | 'USER'

let userCounter = 0

/** Inserts a user directly and returns its id, email and a "Bearer <jwt>" token for it. */
export const insertUser = async (
  role: Role = 'USER',
): Promise<{ id: string; token: string; email: string }> => {
  const conn = await db()
  userCounter += 1
  const email = `user-${userCounter}-${Date.now()}@example.test`
  const res = await conn.connection.collection('users').insertOne({
    name: `user-${userCounter}`,
    email,
    password: 'not-a-real-hash',
    role,
    date: new Date(),
    updatedAt: new Date(),
  })
  const id = res.insertedId.toString()
  const token = `Bearer ${jwt.sign({ id }, 'test-secret', { expiresIn: '7d' })}`
  return { id, token, email }
}

/** Deletes a user, leaving any token for it stale. */
export const deleteUser = async (id: string): Promise<void> => {
  const conn = await db()
  await conn.connection
    .collection('users')
    .deleteOne({ _id: new mongoose.Types.ObjectId(id) })
}
