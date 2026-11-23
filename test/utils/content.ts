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

/**
 * Inserts `count` posts by this author and returns their ids newest first.
 * Dates step down a second at a time from `date` (default now); with
 * `sameDate` they all share `date`, and the ids come back by `_id` descending,
 * which is the API's tie-break order.
 */
export const insertPosts = async (
  authorId: string,
  count: number,
  opts: { date?: Date; sameDate?: boolean } = {},
): Promise<string[]> => {
  const conn = await db()
  const start = (opts.date ?? new Date()).getTime()
  const docs = Array.from({ length: count }, (_, i) => ({
    _id: new mongoose.Types.ObjectId(),
    content: `post ${i}`,
    imageId: `fake-folder/seeded-${i}`,
    author: oid(authorId),
    date: new Date(opts.sameDate ? start : start - i * 1000),
    updatedAt: new Date(),
  }))
  await conn.connection.collection('posts').insertMany(docs)
  const ids = docs.map((doc) => doc._id.toString())
  return opts.sameDate ? ids.sort().reverse() : ids
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
