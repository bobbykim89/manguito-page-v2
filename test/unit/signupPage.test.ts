import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import SignupPage from '@/pages/auth/signup.vue'

const rule = 'Password must include one number'

describe('signup password rule', () => {
  it('stays quiet until a password is typed', async () => {
    const wrapper = await mountSuspended(SignupPage)
    expect(wrapper.text()).not.toContain(rule)
  })

  it('shows the rule while the password does not meet it', async () => {
    const wrapper = await mountSuspended(SignupPage)
    await wrapper.find('#signup-pw').setValue('short')
    expect(wrapper.text()).toContain(rule)
    expect(wrapper.find('#signup-pw').attributes('aria-invalid')).toBe('true')
  })

  it('hides the rule once the password meets it', async () => {
    const wrapper = await mountSuspended(SignupPage)
    await wrapper.find('#signup-pw').setValue('short')
    await wrapper.find('#signup-pw').setValue('Manguito1!')
    expect(wrapper.text()).not.toContain(rule)
  })
})

describe('signup fields', () => {
  it.each([
    '#signup-name',
    '#signup-email',
    '#signup-pw',
    '#signup-pw-confirm',
  ])('%s is required', async (id) => {
    const wrapper = await mountSuspended(SignupPage)
    const input = wrapper.find(id)
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).required).toBe(true)
  })
})
