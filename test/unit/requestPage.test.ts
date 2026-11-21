import { mountSuspended } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import RequestPage from '@/pages/auth/request.vue'
import { useAlertStore } from '@/stores'
import { clearApiMocks, mockApi, okEnvelope, resetState } from './helpers'

const GENERIC = "If that email has an account, we've sent a reset link."

describe('password reset request page', () => {
  let body: unknown

  beforeEach(() => {
    resetState()
    body = undefined
    mockApi('POST', '/api/token/send-token', async (e) => {
      body = await readBody(e)
      return okEnvelope({ status: 200, message: GENERIC })
    })
  })
  afterEach(clearApiMocks)

  const submit = async () => {
    const wrapper = await mountSuspended(RequestPage)
    await wrapper.find('#email').setValue('kiwi@example.test')
    await wrapper.find('form').trigger('submit')
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  it('sends only the email', async () => {
    await submit()
    expect(body).toEqual({ email: 'kiwi@example.test' })
  })

  it('tells the user to check for a link', async () => {
    await submit()
    const alertStore = useAlertStore(useNuxtApp().$pinia as Pinia)
    expect(alertStore.alertMessage).toBe(GENERIC)
  })
})
