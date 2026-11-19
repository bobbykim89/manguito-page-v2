import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ErrorPage from '@/error.vue'

describe('error.vue', () => {
  it('shows a generic message for a 5xx, never server internals', async () => {
    const wrapper = await mountSuspended(ErrorPage, {
      props: {
        error: { statusCode: 500, statusMessage: 'mongo exploded at 10.0.0.1' },
      },
    })
    expect(wrapper.text()).toContain('500')
    expect(wrapper.text()).toContain('Something went wrong, please try again')
    expect(wrapper.text()).not.toContain('mongo exploded')
  })

  it('shows the message for other 4xx errors', async () => {
    const wrapper = await mountSuspended(ErrorPage, {
      props: { error: { statusCode: 403, statusMessage: 'Access denied' } },
    })
    expect(wrapper.text()).toContain('403')
    expect(wrapper.text()).toContain('Access denied')
  })
})
