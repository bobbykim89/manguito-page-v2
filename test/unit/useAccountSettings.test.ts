import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserStore } from '@/stores'
import { resetState } from './helpers'

describe('useAccountSettings', () => {
  beforeEach(resetState)
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('confirmed username change calls the store and closes', async () => {
    vi.stubGlobal('confirm', () => true)
    const update = vi
      .spyOn(useUserStore(), 'updateUsername')
      .mockResolvedValue(undefined)
    const onDone = vi.fn()
    const { submitUsername } = useAccountSettings(onDone)
    const e = new Event('submit', { cancelable: true })
    await submitUsername(e, 'new')
    expect(e.defaultPrevented).toBe(true)
    expect(update).toHaveBeenCalledWith({ username: 'new' })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('declined change makes no call but still closes', async () => {
    vi.stubGlobal('confirm', () => false)
    const update = vi.spyOn(useUserStore(), 'updateUsername')
    const onDone = vi.fn()
    const { submitUsername } = useAccountSettings(onDone)
    await submitUsername(new Event('submit'), 'new')
    expect(update).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('password change passes both passwords', async () => {
    vi.stubGlobal('confirm', () => true)
    const update = vi
      .spyOn(useUserStore(), 'updatePassword')
      .mockResolvedValue(undefined)
    const { submitPassword } = useAccountSettings(() => {})
    await submitPassword(new Event('submit'), 'OldPassw0rd!', 'NewPassw0rd!')
    expect(update).toHaveBeenCalledWith({
      currentPassword: 'OldPassw0rd!',
      newPassword: 'NewPassw0rd!',
    })
  })
})
