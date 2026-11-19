import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAlertStore } from '@/stores'
import { resetState } from './helpers'

describe('alertStore', () => {
  beforeEach(() => {
    resetState()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows an alert, then clears it after 5 s', () => {
    const alert = useAlertStore()
    alert.setAlert('saved', 'success')
    expect(alert.alertMessage).toBe('saved')
    expect(alert.alertColor).toBe('success')
    vi.advanceTimersByTime(5000)
    expect(alert.alertMessage).toBeNull()
    expect(alert.alertColor).toBe('danger')
  })
})
