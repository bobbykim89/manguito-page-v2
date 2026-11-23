import mongoose, { type Types } from 'mongoose'

/**
 * Posts are listed newest first: `date` descending, then `_id` descending to
 * break ties. These filters select the posts strictly after (older) or
 * strictly before (newer) a given position in that order.
 */
export const olderThan = (date: Date, id: Types.ObjectId) => ({
  $or: [{ date: { $lt: date } }, { date, _id: { $lt: id } }],
})

export const newerThan = (date: Date, id: Types.ObjectId) => ({
  $or: [{ date: { $gt: date } }, { date, _id: { $gt: id } }],
})

/**
 * A page boundary: the last listed post's date and id. It carries the date
 * itself, so it stays valid when that post is deleted.
 */
export const encodePostCursor = (post: {
  date: Date
  _id: Types.ObjectId
}): string => `${post.date.getTime()}_${post._id.toString()}`

/** Reads a cursor already checked against `POST_CURSOR_PATTERN`. */
export const decodePostCursor = (
  cursor: string,
): { date: Date; id: Types.ObjectId } => {
  const [ms, id] = cursor.split('_') as [string, string]
  return { date: new Date(Number(ms)), id: new mongoose.Types.ObjectId(id) }
}
