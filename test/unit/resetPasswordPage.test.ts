import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ResetPasswordPage from '@/pages/auth/reset-password.vue'
import { useAlertStore } from '@/stores'
import { clearApiMocks, mockApi, okEnvelope, resetState } from './helpers'

describe('reset password page', () => {
  beforeEach(resetState)
  afterEach(() => {
    clearApiMocks()
    vi.restoreAllMocks()
  })

  it('a successful reset alerts and goes to login', async () => {
    mockApi('POST', '/api/token/reset-password', () => okEnvelope(null))
    const wrapper = await mountSuspended(ResetPasswordPage, {
      route: '/auth/reset-password?user=u1&token=t1',
    })
    const push = vi.spyOn(useRouter(), 'push')
    await wrapper.find('#new-password').setValue('NewPassw0rd!')
    await wrapper.find('form').trigger('submit')
    await new Promise((resolve) => setTimeout(resolve, 50))
    const alertStore = useAlertStore(useNuxtApp().$pinia as Pinia)
    expect(alertStore.alertMessage).toBe('Successfully updated password')
    expect(push).toHaveBeenCalledWith({ path: '/auth/login' })
  })
})
