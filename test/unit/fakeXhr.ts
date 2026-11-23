/**
 * A stand-in for XMLHttpRequest (install with
 * `vi.stubGlobal('XMLHttpRequest', FakeXhr)`): it records each request and
 * lets the test fire upload progress, answer, or fail the network.
 */
export class FakeXhr {
  static sent: FakeXhr[] = []
  static reset() {
    FakeXhr.sent = []
  }
  static get last(): FakeXhr {
    const xhr = FakeXhr.sent.at(-1)
    if (!xhr) throw new Error('no request was sent')
    return xhr
  }

  method = ''
  url = ''
  headers: Record<string, string> = {}
  body: unknown
  status = 0
  responseText = ''
  upload: {
    onprogress:
      | null
      | ((e: {
          loaded: number
          total: number
          lengthComputable: boolean
        }) => void)
  } = { onprogress: null }
  onload: null | (() => void) = null
  onerror: null | (() => void) = null

  open(method: string, url: string) {
    this.method = method
    this.url = url
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value
  }
  send(body: unknown) {
    this.body = body
    FakeXhr.sent.push(this)
  }

  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ loaded, total, lengthComputable: true })
  }
  respond(status: number, body: unknown) {
    this.status = status
    this.responseText = typeof body === 'string' ? body : JSON.stringify(body)
    this.onload?.()
  }
  fail() {
    this.status = 0
    this.onerror?.()
  }
}
