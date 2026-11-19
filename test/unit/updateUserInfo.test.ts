import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import UpdateUserInfo from '@/components/layout-components/UpdateUserInfo.vue'

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

// test-utils stubs <Transition> by default; the Collapse's hooks need the real one
const mountPanels = () =>
  mountSuspended(UpdateUserInfo, {
    global: { stubs: { transition: false } },
  })

// Collapse transitions finish after a frame
const settle = () => new Promise((resolve) => setTimeout(resolve, 100))

const trigger = (wrapper: Wrapper, text: string) => {
  const button = wrapper.findAll('button').find((b) => b.text() === text)
  if (!button) throw new Error(`no "${text}" button`)
  return button
}
const usernameTrigger = (w: Wrapper) => trigger(w, 'Update Username')
const passwordTrigger = (w: Wrapper) => trigger(w, 'Update Password')

// Collapse markup: <div :id> > <div v-show="isOpen"> > <div :class="customClass">
const isShown = (wrapper: Wrapper, id: string) =>
  (wrapper.find(`#${id} > div`).element as HTMLElement).style.display !== 'none'

const click = async (button: ReturnType<typeof trigger>) => {
  await button.trigger('click')
  await settle()
}

describe('UpdateUserInfo account panels', () => {
  it('starts with both panels closed and wired to their triggers', async () => {
    const wrapper = await mountPanels()
    expect(usernameTrigger(wrapper).attributes('aria-expanded')).toBe('false')
    expect(usernameTrigger(wrapper).attributes('aria-controls')).toBe(
      'update-username',
    )
    expect(passwordTrigger(wrapper).attributes('aria-expanded')).toBe('false')
    expect(passwordTrigger(wrapper).attributes('aria-controls')).toBe(
      'update-password',
    )
    expect(isShown(wrapper, 'update-username')).toBe(false)
    expect(isShown(wrapper, 'update-password')).toBe(false)
  })

  it('opens a panel from its trigger', async () => {
    const wrapper = await mountPanels()
    await click(usernameTrigger(wrapper))
    expect(usernameTrigger(wrapper).attributes('aria-expanded')).toBe('true')
    expect(isShown(wrapper, 'update-username')).toBe(true)
  })

  it('keeps only one panel open', async () => {
    const wrapper = await mountPanels()
    await click(usernameTrigger(wrapper))
    await click(passwordTrigger(wrapper))
    expect(passwordTrigger(wrapper).attributes('aria-expanded')).toBe('true')
    expect(isShown(wrapper, 'update-password')).toBe(true)
    expect(usernameTrigger(wrapper).attributes('aria-expanded')).toBe('false')
    expect(isShown(wrapper, 'update-username')).toBe(false)
  })

  it('closes an open panel from its trigger', async () => {
    const wrapper = await mountPanels()
    await click(usernameTrigger(wrapper))
    await click(usernameTrigger(wrapper))
    expect(usernameTrigger(wrapper).attributes('aria-expanded')).toBe('false')
    expect(isShown(wrapper, 'update-username')).toBe(false)
  })

  it('toggles again after its form submits', async () => {
    const wrapper = await mountPanels()
    await click(usernameTrigger(wrapper))
    await wrapper.find('#user-name').setValue('kiwi')
    await wrapper.find('#update-username form').trigger('submit')
    expect(wrapper.emitted('on-username-update')).toHaveLength(1)
    expect(wrapper.emitted('on-username-update')![0]![1]).toBe('kiwi')
    await click(usernameTrigger(wrapper))
    expect(usernameTrigger(wrapper).attributes('aria-expanded')).toBe('false')
    await click(usernameTrigger(wrapper))
    expect(usernameTrigger(wrapper).attributes('aria-expanded')).toBe('true')
  })

  it('keeps the panel background', async () => {
    const wrapper = await mountPanels()
    for (const id of ['update-username', 'update-password']) {
      expect(wrapper.find(`#${id} > div > div`).classes()).toContain(
        'bg-light-3/65',
      )
    }
  })
})
