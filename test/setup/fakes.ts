import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { SMTPServer } from 'smtp-server'

interface SentMail {
  to: string
  subject: string
  text: string
}

/** Decodes a quoted-printable body (nodemailer uses it for long lines). */
const decodeQuotedPrintable = (body: string) =>
  Buffer.from(
    body
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-F]{2})/g, (_, hex: string) =>
        String.fromCharCode(parseInt(hex, 16)),
      ),
    'latin1',
  ).toString('utf8')

const parseMail = (raw: string, to: string): SentMail => {
  const split = raw.indexOf('\r\n\r\n')
  const head = raw.slice(0, split)
  const body = raw.slice(split + 4).replace(/\r\n$/, '')
  const subject = head.match(/^Subject: (.*)$/m)?.[1] ?? ''
  const qp = /^Content-Transfer-Encoding: quoted-printable$/im.test(head)
  return { to, subject, text: qp ? decodeQuotedPrintable(body) : body }
}

const drain = (req: IncomingMessage) =>
  new Promise<void>((resolve) => {
    req.on('data', () => {})
    req.on('end', () => resolve())
  })

/**
 * Local stand-ins for Gmail SMTP and the Cloudinary upload API, so the API
 * tests never reach the network. The HTTP server also exposes what it
 * recorded under /__mail, /__cloudinary and POST /__reset, and POST
 * /__fail?service=mail|cloudinary makes the next call to that service fail.
 */
export const startFakes = async () => {
  const mail: SentMail[] = []
  const cloudinary: Array<{ method: string; path: string }> = []
  // set by POST /__fail?service=…; each fails one call, then clears
  const failing = { mail: false, cloudinary: false }

  const smtp = new SMTPServer({
    authOptional: true,
    allowInsecureAuth: true,
    disabledCommands: ['STARTTLS'],
    logger: false,
    onAuth: (_auth, _session, callback) => callback(null, { user: 'test' }),
    onRcptTo: (_address, _session, callback) => {
      if (!failing.mail) return callback()
      failing.mail = false
      callback(Object.assign(new Error('fake failure'), { responseCode: 550 }))
    },
    onData: (stream, session, callback) => {
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        for (const rcpt of session.envelope.rcptTo)
          mail.push(parseMail(raw, rcpt.address))
        callback()
      })
    },
  })
  await new Promise<void>((resolve) => smtp.listen(0, '127.0.0.1', resolve))
  const smtpPort = (smtp.server.address() as AddressInfo).port

  const http = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://fake').pathname
    await drain(req)
    const json = (status: number, value: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(value))
    }
    if (path === '/__mail') return json(200, mail)
    if (path === '/__cloudinary') return json(200, cloudinary)
    if (path === '/__reset' && req.method === 'POST') {
      mail.length = 0
      cloudinary.length = 0
      failing.mail = false
      failing.cloudinary = false
      return json(200, { ok: true })
    }
    if (path === '/__fail' && req.method === 'POST') {
      const service = new URL(req.url ?? '/', 'http://fake').searchParams.get(
        'service',
      )
      if (service !== 'mail' && service !== 'cloudinary')
        return json(400, { error: `unknown service: ${service}` })
      failing[service] = true
      return json(200, { ok: true })
    }
    cloudinary.push({ method: req.method ?? 'GET', path })
    if (failing.cloudinary) {
      failing.cloudinary = false
      return json(500, { error: { message: 'fake failure' } })
    }
    if (path.endsWith('/image/upload'))
      return json(200, { public_id: 'fake-folder/fake-id' })
    if (path.endsWith('/image/destroy')) return json(200, { result: 'ok' })
    return json(404, { error: { message: `fake Cloudinary: ${path}` } })
  })
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve))
  const httpUrl = `http://127.0.0.1:${(http.address() as AddressInfo).port}`

  return {
    smtpPort,
    httpUrl,
    stop: async () => {
      await new Promise<void>((resolve) => smtp.close(() => resolve()))
      await new Promise<void>((resolve) => http.close(() => resolve()))
    },
  }
}
