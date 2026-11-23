import { useUserStore } from '@/stores/userStore'

/**
 * The account forms both layouts show in their sidebar: each asks for
 * confirmation, runs the change when confirmed, and always calls `onDone`
 * (the layout closes its sidebar).
 */
export const useAccountSettings = (onDone: () => void) => {
  const userStore = useUserStore()
  const confirmed = (message: string) =>
    import.meta.client && window.confirm(message)

  const submitUsername = async (e: Event, name: string) => {
    e.preventDefault()
    if (confirmed('Please confirm username update')) {
      await userStore.updateUsername({ username: name })
    }
    onDone()
  }
  const submitPassword = async (e: Event, current: string, next: string) => {
    e.preventDefault()
    if (confirmed('Please confirm password update.')) {
      await userStore.updatePassword({
        currentPassword: current,
        newPassword: next,
      })
    }
    onDone()
  }

  return { submitUsername, submitPassword }
}
