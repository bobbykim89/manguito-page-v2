import { inject } from 'vitest'

export interface SentMail {
  to: string
  subject: string
  text: string
}

export interface CloudinaryCall {
  method: string
  path: string
}

const control = async <T>(path: string, method = 'GET'): Promise<T> => {
  const res = await fetch(`${inject('fakesUrl')}${path}`, { method })
  if (!res.ok) throw new Error(`fakes ${method} ${path}: ${res.status}`)
  return (await res.json()) as T
}

/** Every message the local mail sink received since the last reset. */
export const sentMail = () => control<SentMail[]>('/__mail')

/** Every request the fake Cloudinary received since the last reset. */
export const cloudinaryCalls = () => control<CloudinaryCall[]>('/__cloudinary')

/** Forgets recorded mail and Cloudinary calls. */
export const resetFakes = async () => {
  await control<{ ok: true }>('/__reset', 'POST')
}

/** The first password-reset link in a mail body. */
export const resetLinkIn = (text: string): URL => {
  const match = text.match(/https?:\/\/\S+\/auth\/reset-password\?\S+/)
  if (!match) throw new Error(`no reset link in:\n${text}`)
  return new URL(match[0])
}
