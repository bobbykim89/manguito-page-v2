import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import LocalDate from '@/components/LocalDate.vue'

describe('LocalDate', () => {
  it('renders the en-US short date of the instant in a <time>', async () => {
    const iso = '2026-11-20T06:00:00.000Z'
    const wrapper = await mountSuspended(LocalDate, {
      props: { datetime: iso },
    })
    const time = wrapper.find('time')
    expect(time.attributes('datetime')).toBe(iso)
    expect(time.text()).toBe(
      new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(iso)),
    )
  })
})
