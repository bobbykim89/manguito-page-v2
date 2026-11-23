import type { Types } from 'mongoose'

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
