import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent } from 'h3'
import { describe, expect, it } from 'vitest'
import { defineApiRoute } from '../../server/utils/defineApiRoute.util'

const fakeEvent = () => {
  const req = new IncomingMessage(new Socket())
  req.method = 'GET'
  req.url = '/api/thing'
  return createEvent(req, new ServerResponse(req))
}

describe('defineApiRoute', () => {
  it('answers data: null when the handler returns undefined', async () => {
    const route = defineApiRoute({ handler: () => undefined })
    expect(await route(fakeEvent())).toEqual({ ok: true, data: null })
  })
})
