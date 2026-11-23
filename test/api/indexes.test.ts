import { describe, expect, it } from 'vitest'
import { api, expectApiError } from '../utils/api'
import { db } from '../utils/db'

type IndexInfo = { key: Record<string, number>; unique?: boolean }

// a collection that doesn't exist yet has no indexes
const indexesOf = async (name: string): Promise<IndexInfo[]> =>
  (await (
    await db()
  ).connection
    .db!.collection(name)
    .indexes()
    .catch(() => [])) as IndexInfo[]

const hasIndex = (
  list: IndexInfo[],
  key: Record<string, number>,
  unique = false,
) =>
  list.some(
    (i) =>
      JSON.stringify(i.key) === JSON.stringify(key) &&
      Boolean(i.unique) === unique,
  )

describe('database indexes', () => {
  it('the app builds its indexes', async () => {
    // The models load, and autoIndex starts, with the first request that
    // reaches a controller; the builds then finish in the background.
    expect((await api('GET', '/api/post')).status).toBe(200)
    const deadline = Date.now() + 5000
    let ok = false
    while (!ok && Date.now() < deadline) {
      ok =
        hasIndex(await indexesOf('users'), { name: 1 }, true) &&
        hasIndex(await indexesOf('posts'), { date: -1 }) &&
        hasIndex(await indexesOf('comments'), { post: 1 }) &&
        hasIndex(await indexesOf('tokens'), { userId: 1 }, true)
      if (!ok) await new Promise((r) => setTimeout(r, 100))
    }
    expect(hasIndex(await indexesOf('users'), { name: 1 }, true)).toBe(true)
    expect(hasIndex(await indexesOf('posts'), { date: -1 })).toBe(true)
    expect(hasIndex(await indexesOf('comments'), { post: 1 })).toBe(true)
    expect(hasIndex(await indexesOf('tokens'), { userId: 1 }, true)).toBe(true)
  })

  it('two signups with one name at once: one wins, one conflicts', async () => {
    const name = `twin-${Date.now() % 1e8}`
    const answers = await Promise.all(
      ['a', 'b'].map((x) =>
        api('POST', '/api/user', {
          body: {
            name,
            email: `${name}-${x}@example.test`,
            password: 'Passw0rd!',
          },
        }),
      ),
    )
    expect(answers.map((r) => r.status).sort()).toEqual([201, 409])
    expectApiError(
      answers.find((r) => r.status === 409)!,
      'CONFLICT',
    )
  })
})
