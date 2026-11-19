import mongoose from 'mongoose'
import { inject } from 'vitest'

let connected: Promise<typeof mongoose> | null = null

/** Mongoose connected to the in-memory test database. */
export const db = (): Promise<typeof mongoose> => {
  connected ??= mongoose.connect(inject('mongoUri'))
  return connected
}
