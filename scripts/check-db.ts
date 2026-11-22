/**
 * Read-only check of a database before #15 part 2b adds indexes and
 * normalizes emails. It only reads (counts, aggregations, index lists) and
 * prints ids, counts and lengths, never emails, names or other values.
 *
 *   node --env-file=.env.local scripts/check-db.ts   # local Docker DB
 *   node --env-file=.env scripts/check-db.ts         # production
 *
 * The connection string comes from the same variables the app uses
 * (resolveMongoUrl), or from NUXT_MONGO_URI when set.
 * Exits 1 when something would block a unique index, 0 otherwise.
 */
import mongoose from 'mongoose'
import { resolveMongoUrl } from '../server/utils/mongoUrl.util.ts'

type Doc = Record<string, unknown>

const url = resolveMongoUrl({
  mongoUri: process.env.NUXT_MONGO_URI,
  workBranch: process.env.WORK_BRANCH,
  mongoId: process.env.MONGO_ADMIN_ID,
  mongoPw: process.env.MONGO_ADMIN_PW,
  mongoClusterName: process.env.MONGO_CLUSTER_NAME,
  mongoUrl: process.env.MONGO_URL,
  mongoDBName: process.env.MONGO_DB_NAME,
})

let blockers = 0
const blocker = (msg: string) => {
  blockers++
  console.log(`  ✗ BLOCKER: ${msg}`)
}
const ok = (msg: string) => console.log(`  ✓ ${msg}`)
const info = (msg: string) => console.log(`  · ${msg}`)
const section = (title: string) => console.log(`\n== ${title}`)

/** Groups of docs sharing a field value (optionally ignoring case), as ids. */
const duplicateGroups = (
  coll: mongoose.mongo.Collection,
  field: string,
  ignoreCase = false,
): Promise<Doc[]> =>
  coll
    .aggregate([
      { $match: { [field]: { $exists: true } } },
      {
        $group: {
          _id: ignoreCase
            ? { $toLower: { $trim: { input: `$${field}` } } }
            : `$${field}`,
          ids: { $push: '$_id' },
          n: { $sum: 1 },
        },
      },
      { $match: { n: { $gt: 1 } } },
      { $project: { _id: 0, ids: 1, n: 1 } },
      { $sort: { n: -1 } },
    ])
    .toArray()

const printGroups = (groups: Doc[]) => {
  for (const g of groups.slice(0, 20)) {
    info(`${g.n} docs: ${(g.ids as unknown[]).map(String).join(', ')}`)
  }
  if (groups.length > 20) info(`… and ${groups.length - 20} more groups`)
}

/** Longest values of a string field: max length and the 5 longest ids. */
const lengths = async (
  coll: mongoose.mongo.Collection,
  field: string,
  label: string,
) => {
  const rows = await coll
    .aggregate([
      { $match: { [field]: { $type: 'string' } } },
      { $project: { len: { $strLenCP: `$${field}` } } },
      { $sort: { len: -1 } },
      { $limit: 5 },
    ])
    .toArray()
  const notString = await coll.countDocuments({
    [field]: { $not: { $type: 'string' } },
  })
  if (rows.length === 0) {
    info(`${label}: no values`)
  } else {
    info(
      `${label}: longest ${rows[0]!.len} chars; top 5: ${rows
        .map((r) => `${r.len} (${String(r._id)})`)
        .join(', ')}`,
    )
  }
  if (notString > 0) info(`${label}: ${notString} docs missing or not text`)
}

/** Docs whose reference points at nothing. */
const orphans = async (
  coll: mongoose.mongo.Collection,
  field: string,
  target: string,
  label: string,
) => {
  const rows = await coll
    .aggregate([
      {
        $lookup: {
          from: target,
          localField: field,
          foreignField: '_id',
          as: 'ref',
        },
      },
      { $match: { ref: { $size: 0 } } },
      { $project: { _id: 1 } },
    ])
    .toArray()
  if (rows.length === 0) ok(`every ${label} exists`)
  else
    info(
      `${rows.length} with a missing ${label}: ${rows
        .slice(0, 20)
        .map((r) => String(r._id))
        .join(', ')}${rows.length > 20 ? ', …' : ''}`,
    )
}

const main = async () => {
  await mongoose.connect(url, { autoIndex: false, autoCreate: false })
  const db = mongoose.connection.db!
  console.log(`Connected to database "${db.databaseName}" (read-only checks)`)

  const users = db.collection('users')
  const posts = db.collection('posts')
  const comments = db.collection('comments')
  const tokens = db.collection('tokens')

  section('Counts and existing indexes')
  for (const coll of [users, posts, comments, tokens]) {
    const n = await coll.estimatedDocumentCount()
    const indexes = await coll.indexes().catch(() => [])
    const list = indexes
      .map(
        (i) =>
          `${JSON.stringify(i.key)}${i.unique ? ' unique' : ''}${
            i.expireAfterSeconds !== undefined
              ? ` ttl=${i.expireAfterSeconds}s`
              : ''
          }`,
      )
      .join('; ')
    info(`${coll.collectionName}: ${n} docs; indexes: ${list || 'none'}`)
  }

  section('Users: email (unique, to become lowercase + trimmed)')
  const emailDupes = await duplicateGroups(users, 'email', true)
  if (emailDupes.length === 0) ok('no two users share an email ignoring case')
  else {
    blocker(`${emailDupes.length} emails shared ignoring case (user ids):`)
    printGroups(emailDupes)
  }
  const unnormalized = await users.countDocuments({
    $expr: {
      $ne: ['$email', { $toLower: { $trim: { input: '$email' } } }],
    },
  })
  info(`${unnormalized} emails have capitals or spaces (would be normalized)`)
  const noEmail = await users.countDocuments({
    email: { $not: { $type: 'string' } },
  })
  if (noEmail > 0) blocker(`${noEmail} users have no email`)

  section('Users: name (unique?)')
  const nameDupes = await duplicateGroups(users, 'name')
  if (nameDupes.length === 0) ok('no two users share a name exactly')
  else {
    blocker(`${nameDupes.length} names shared exactly (user ids):`)
    printGroups(nameDupes)
  }
  const nameDupesCi = await duplicateGroups(users, 'name', true)
  if (nameDupesCi.length === 0) ok('no two users share a name ignoring case')
  else {
    info(
      `${nameDupesCi.length} names shared ignoring case (only matters if names become case-insensitive):`,
    )
    printGroups(nameDupesCi)
  }

  section('Reset tokens (unique per user)')
  const tokenDupes = await duplicateGroups(tokens, 'userId')
  if (tokenDupes.length === 0) ok('no user has more than one reset token')
  else {
    // Tokens expire after an hour, so this may clear itself; rerun later.
    blocker(
      `${tokenDupes.length} users have several reset tokens (token ids, expire within an hour):`,
    )
    printGroups(tokenDupes)
  }

  section('Text lengths (to pick limits)')
  await lengths(posts, 'content', 'post content')
  await lengths(comments, 'text', 'comment text')
  await lengths(users, 'name', 'user name')
  await lengths(users, 'email', 'user email')

  // Lean reads skip schema defaults, so a doc missing one of these would
  // answer without that field.
  section('Fields filled in from schema defaults')
  const defaulted: [mongoose.mongo.Collection, string[]][] = [
    [users, ['role', 'date', 'updatedAt']],
    [posts, ['date', 'updatedAt']],
    [comments, ['date']],
  ]
  for (const [coll, fields] of defaulted) {
    for (const field of fields) {
      const missing = await coll.countDocuments({ [field]: { $exists: false } })
      if (missing === 0) ok(`every ${coll.collectionName} doc has ${field}`)
      else info(`${missing} ${coll.collectionName} docs have no ${field}`)
    }
  }

  section('Dangling references')
  await orphans(posts, 'author', 'users', 'post author')
  await orphans(comments, 'author', 'users', 'comment author')
  await orphans(comments, 'post', 'posts', 'comment post')

  console.log(
    blockers === 0
      ? '\nNo blockers: the unique indexes can be built.'
      : `\n${blockers} blocker(s): resolve them before building unique indexes.`,
  )
}

main()
  .catch((err: unknown) => {
    console.error('Check failed:', err instanceof Error ? err.message : err)
    blockers = blockers || 1
  })
  .finally(async () => {
    await mongoose.disconnect()
    process.exit(blockers > 0 ? 1 : 0)
  })
