import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { createWriteStream, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { getRandomPort } from 'get-port-please'
import { MongoMemoryServer } from 'mongodb-memory-server'
import type { TestProject } from 'vitest/node'
import { startFakes } from './fakes'

declare module 'vitest' {
  export interface ProvidedContext {
    baseUrl: string
    mongoUri: string
    serverLog: string
    fakesUrl: string
  }
}

const root = resolve(import.meta.dirname, '../..')
const tmpDir = resolve(root, 'test/.tmp')
const serverLog = resolve(tmpDir, 'server.log')

const waitForServer = async (url: string, timeoutMs = 60_000) => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      await fetch(`${url}/api/does-not-exist`)
      return
    } catch {
      await new Promise((r) => setTimeout(r, 250))
    }
  }
  throw new Error(`Test server did not start within ${timeoutMs} ms`)
}

export default async function setup(project: TestProject) {
  mkdirSync(tmpDir, { recursive: true })

  const mongo = await MongoMemoryServer.create()
  const mongoUri = mongo.getUri('manguito-page-test')

  if (process.env.SKIP_BUILD !== '1') {
    // Build with fake, committed values so the developer's .env is never loaded.
    const build = spawnSync(
      resolve(root, 'node_modules/.bin/nuxt'),
      ['build', '--dotenv', 'test/test.env'],
      {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' },
      },
    )
    if (build.status !== 0)
      throw new Error('nuxt build failed for the API tests')
  }

  const fakes = await startFakes()

  const port = await getRandomPort()
  const logStream = createWriteStream(serverLog, { flags: 'w' })
  // Vercel's Node runtime can't require() ES modules, though local Node 24 can.
  // Turn that off here too so a dependency that relies on it fails the tests
  // instead of only failing in production.
  const nodeArgs = [
    '--no-experimental-require-module',
    '.output/server/index.mjs',
  ]
  const server: ChildProcess = spawn('node', nodeArgs, {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      NITRO_PORT: String(port),
      NUXT_MONGO_URI: mongoUri,
      NUXT_JWT_SECRET: 'test-secret',
      // mail and Cloudinary go to local fakes (test/setup/fakes.ts)
      NUXT_MAILER_HOST: '127.0.0.1',
      NUXT_MAILER_PORT: String(fakes.smtpPort),
      NUXT_MAILER_SECURE: 'false',
      CLOUDINARY_URL: `cloudinary://key:secret@test?upload_prefix=${fakes.httpUrl}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stdout?.pipe(logStream)
  server.stderr?.pipe(logStream)

  const baseUrl = `http://127.0.0.1:${port}`
  await waitForServer(baseUrl)

  project.provide('baseUrl', baseUrl)
  project.provide('mongoUri', mongoUri)
  project.provide('serverLog', serverLog)
  project.provide('fakesUrl', fakes.httpUrl)

  return async () => {
    server.kill()
    await mongo.stop()
    await fakes.stop()
  }
}
