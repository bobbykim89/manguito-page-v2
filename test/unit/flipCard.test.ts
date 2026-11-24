import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import FlipCard from '@/components/home/FlipCard.vue'

const props = {
  imageSource: 'x.jpg',
  caption: 'On the fridge',
  to: '/posts/p1',
  index: 3,
  color: 'primary' as const,
}

// transitions are stubbed (test-utils' default), as they are off for a
// visitor who asks for reduced motion: nothing may wait on a transition event
describe('FlipCard', () => {
  it('starts as a button named "Flip photo 3"', async () => {
    const wrapper = await mountSuspended(FlipCard, { props })
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]!.attributes('type')).toBe('button')
    expect(buttons[0]!.attributes('aria-label')).toBe('Flip photo 3')
    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('flips on Enter and moves focus to the post link', async () => {
    const wrapper = await mountSuspended(FlipCard, {
      props,
      attachTo: document.body,
    })
    // a native button turns Enter into a click
    await wrapper.find('button').trigger('click')
    await nextTick()
    const link = wrapper.find('a[href="/posts/p1"]')
    expect(link.exists()).toBe(true)
    expect(link.find('img').attributes('alt')).toBe('On the fridge')
    expect(document.activeElement).toBe(link.element)
    expect(wrapper.find('button').exists()).toBe(false)
    wrapper.unmount()
  })

  // the unit env stubs router links, so following the link is checked in the
  // browser walk; here: the second click lands on a link to the post
  it('turns into a link to the post after the first click', async () => {
    const wrapper = await mountSuspended(FlipCard, { props })
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(wrapper.findAll('a')).toHaveLength(1)
    expect(wrapper.find('a').attributes('href')).toBe('/posts/p1')
  })
})
