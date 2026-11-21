import { mountSuspended } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import AdminUsersPage from '@/pages/admin/users.vue'
import { clearApiMocks, mockApi, okEnvelope, resetState } from './helpers'

const kiwi = {
  _id: 'u2',
  name: 'kiwi',
  email: 'kiwi@example.test',
  role: 'USER',
}

// Modal transitions finish after a frame; the Modal ignores close() until then
const settle = () => new Promise((resolve) => setTimeout(resolve, 100))

describe('admin users role change', () => {
  let sent: unknown[] = []
  beforeEach(() => {
    resetState()
    sent = []
    useAuthToken().value = 'Bearer admin'
    mockApi('GET', '/api/user/admin', () => okEnvelope([kiwi]))
    mockApi('PUT', '/api/user/admin/u2', async (event) => {
      sent.push(await readBody(event))
      return okEnvelope({ ...kiwi, role: 'MANAGER' })
    })
  })
  afterEach(() => {
    clearApiMocks()
  })

  it('submits the role picked in the modal', async () => {
    // test-utils stubs <Transition> by default; the Modal's hooks need the real one
    const wrapper = await mountSuspended(AdminUsersPage, {
      global: { stubs: { transition: false } },
    })
    // the edit button is (mis)labelled "delete post" today; #14 fixes the label
    await wrapper.find('button[aria-label="delete post"]').trigger('click')
    await settle()
    const user = wrapper.find('#option-user').element as HTMLInputElement
    expect(user.checked).toBe(true)
    await wrapper.find('#option-manager').setValue(true)
    await wrapper.find('[role="dialog"] form').trigger('submit')
    await settle()
    expect(sent).toEqual([{ role: 'MANAGER' }])
  })
})
