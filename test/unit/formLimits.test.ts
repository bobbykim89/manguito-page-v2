import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import UpdateUserInfo from '@/components/layout-components/UpdateUserInfo.vue'
import CommentInput from '@/components/posts/CommentInput.vue'
import ContentBlock from '@/components/posts/ContentBlock.vue'
import SignupPage from '@/pages/auth/signup.vue'

const post = {
  _id: 'p1',
  content: 'a post about Manguito',
  imageId: 'folder/bird',
  author: { _id: 'u1', name: 'mango' },
  date: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('form length limits', () => {
  it("CommentInput flags a comment over 500 characters and won't submit it", async () => {
    const wrapper = await mountSuspended(CommentInput)
    await wrapper.find('textarea').setValue('x'.repeat(501))
    expect(wrapper.text()).toContain('Comments can be at most 500 characters.')
    expect(
      wrapper.find('button[type="submit"]').attributes('disabled'),
    ).toBeDefined()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit-comment')).toBeUndefined()
  })

  it('ContentBlock flags a caption over 1000 characters in edit mode', async () => {
    const wrapper = await mountSuspended(ContentBlock, {
      props: { isAdmin: false, isAuthor: true, post: post as never },
    })
    await wrapper.find('button[aria-label="edit-post"]').trigger('click')
    await wrapper.find('textarea').setValue('x'.repeat(1001))
    expect(wrapper.text()).toContain('Captions can be at most 1000 characters.')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('on-save')).toBeUndefined()
  })

  it('username inputs cap at 30 characters', async () => {
    const signup = await mountSuspended(SignupPage)
    expect(signup.find('#signup-name').attributes('maxlength')).toBe('30')
    const panels = await mountSuspended(UpdateUserInfo, {
      global: { stubs: { transition: false } },
    })
    expect(panels.find('#user-name').attributes('maxlength')).toBe('30')
  })
})
