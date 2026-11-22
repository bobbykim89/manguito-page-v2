import { db } from './db'

/**
 * How many times the server loaded this user as the current user while `fn`
 * ran, counted with the MongoDB profiler. Filtering on the user's id keeps
 * other users' reads out of the count. A `populate('author', 'name')` read
 * (projection `{ name: 1 }`) fills a response's author, not the session, so
 * it isn't counted.
 */
export const userReadsFor = async (
  userId: string,
  fn: () => Promise<unknown>,
): Promise<number> => {
  const conn = (await db()).connection.db!
  const since = new Date()
  await conn.command({ profile: 2 })
  try {
    await fn()
  } finally {
    await conn.command({ profile: 0 })
  }
  const entries = await conn
    .collection('system.profile')
    .find({ ts: { $gte: since }, op: 'query', ns: /\.users$/ })
    .toArray()
  return entries.filter(
    (p) =>
      JSON.stringify(p.command?.filter ?? {}).includes(userId) &&
      JSON.stringify(p.command?.projection) !== '{"name":1}',
  ).length
}
