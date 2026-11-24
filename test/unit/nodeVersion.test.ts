import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Vercel picks the Node version from engines.node; ">=24" would let it move to
// a later major on its own (#29). Local and CI use .nvmrc.
describe('node version', () => {
  it('pins engines.node to the .nvmrc major', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      engines: { node: string }
    }
    const major = readFileSync('.nvmrc', 'utf8').trim().split('.')[0]
    expect(pkg.engines.node).toBe(`${major}.x`)
  })
})
