import mongoose from 'mongoose'
import { db } from './db'

const oid = (id: string) => new mongoose.Types.ObjectId(id)

/** Inserts a post by this author and returns its id. */
export const insertPost = async (authorId: string): Promise<string> => {
  const conn = await db()
  const res = await conn.connection.collection('posts').insertOne({
    content: 'a post about Manguito',
    imageId: 'fake-folder/seeded',
    author: oid(authorId),
    date: new Date(),
    updatedAt: new Date(),
  })
  return res.insertedId.toString()
}

/** Inserts a comment by this author on this post and returns its id. */
export const insertComment = async (
  authorId: string,
  postId: string,
): Promise<string> => {
  const conn = await db()
  const res = await conn.connection.collection('comments').insertOne({
    text: 'cute bird',
    author: oid(authorId),
    post: oid(postId),
    date: new Date(),
  })
  return res.insertedId.toString()
}

/** Whether a document with this id is still in the collection. */
export const exists = async (
  collection: 'posts' | 'comments',
  id: string,
): Promise<boolean> => {
  const conn = await db()
  return (
    (await conn.connection.collection(collection).countDocuments({
      _id: oid(id),
    })) === 1
  )
}

/** Removes every post and comment (API test files share one database). */
export const clearContent = async (): Promise<void> => {
  const conn = await db()
  await conn.connection.collection('posts').deleteMany({})
  await conn.connection.collection('comments').deleteMany({})
}
