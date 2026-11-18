import { describe, expect, it } from 'vitest'
import { resolveMongoUrl } from '../../server/utils/mongoUrl.util'

const base = {
  mongoId: 'u',
  mongoPw: 'p',
  mongoClusterName: 'c',
  mongoUrl: 'x',
  mongoDBName: 'd',
}

describe('resolveMongoUrl', () => {
  it('uses mongoUri when set', () => {
    expect(
      resolveMongoUrl({
        ...base,
        workBranch: 'LOCAL',
        mongoUri: 'mongodb://127.0.0.1:1/t',
      }),
    ).toBe('mongodb://127.0.0.1:1/t')
  })

  it('builds the local URL when mongoUri is empty', () => {
    expect(
      resolveMongoUrl({ ...base, workBranch: 'LOCAL', mongoUri: '' }),
    ).toBe('mongodb://u:p@localhost:8080')
  })

  it('builds the Atlas URL otherwise', () => {
    expect(resolveMongoUrl({ ...base, workBranch: 'PROD' })).toBe(
      'mongodb+srv://u:p@c.x.mongodb.net/d?retryWrites=true&w=majority',
    )
  })
})
