import { type AuthInput } from '#shared/dto/auth'
import type {
  NewUsernameInput,
  PwUpdateInput,
  SetAdminInput,
  UserInput,
} from '#shared/dto/user'
import type { UserRoleType } from '#shared/models'
import type { UserType } from '#shared/types'
import { useApiAction } from '@/composables/useApiAction'
import { useAuthToken } from '@/composables/useAuthToken'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAlertStore } from './alertStore'

interface AuthToken {
  accessToken: string
}

/** The session: who is logged in. Everything else is derived from it. */
export const useUserStore = defineStore('user', () => {
  const alertStore = useAlertStore()
  const cookie = useAuthToken()
  const { $api } = useNuxtApp()
  const { run } = useApiAction()

  // USERS: states
  const currentUser = ref<UserType | null>(null)
  // true once a held session was rejected (expired or stale); the guards send
  // protected pages to /auth/login?reason=expired while it's set
  const sessionExpired = ref<boolean>(false)
  // the startup auth check, shared by init and route guards; kept out of
  // state so it never serializes into the payload
  let authCheck: Promise<void> | null = null

  // USERS: getters
  const isAuthenticated = computed(() => currentUser.value !== null)
  const role = computed<UserRoleType | null>(
    () => currentUser.value?.role ?? null,
  )
  const isAdmin = computed(() => role.value === 'ADMIN')
  const isManagerOrUp = computed(
    () => role.value === 'ADMIN' || role.value === 'MANAGER',
  )

  // USERS: actions
  const clearSession = () => {
    cookie.value = null
    currentUser.value = null
  }
  /** The server says the session is gone: log out; guards send to login. */
  const expireSession = () => {
    // only a session that was actually held can expire
    if (cookie.value) sessionExpired.value = true
    clearSession()
  }
  const logoutUser = () => {
    clearSession()
    sessionExpired.value = false
    alertStore.setAlert('Logout successful!', 'success')
  }
  /** Loads the user for the cookie just stored by login or signup. */
  const startSession = async (accessToken: string, success: string) => {
    cookie.value = accessToken
    sessionExpired.value = false
    const res = await run(() => $api<UserType>('/api/auth'), { success })
    if (res.ok) currentUser.value = res.data
  }

  /** The startup session check, at most once per app instance; quiet on 401. */
  const ensureAuth = (): Promise<void> => {
    authCheck ??= (async () => {
      if (!cookie.value) return
      const res = await run(() => $api<UserType>('/api/auth'), {
        success: 'Successfully authenticated user',
        quiet: true,
      })
      if (res.ok) currentUser.value = res.data
    })()
    return authCheck
  }
  const loginWithCredential = async (payload: AuthInput) => {
    const res = await run(() =>
      $api<AuthToken>('/api/auth', { method: 'POST', body: payload }),
    )
    if (res.ok) await startSession(res.data.accessToken, 'Login Successful!')
  }
  const signupUser = async (payload: UserInput) => {
    const res = await run(() =>
      $api<AuthToken>('/api/user', { method: 'POST', body: payload }),
    )
    if (res.ok) await startSession(res.data.accessToken, 'Signup successful!')
  }
  const updateUsername = async (payload: NewUsernameInput) => {
    const res = await run(
      () =>
        $api<UserType>('/api/user/user-info/username', {
          method: 'PUT',
          body: payload,
        }),
      { success: 'Successfully updated username' },
    )
    if (res.ok) currentUser.value = res.data
  }
  const updatePassword = async (payload: PwUpdateInput) => {
    await run(
      () =>
        $api('/api/user/user-info/password', { method: 'PUT', body: payload }),
      { success: 'Successfully updated user password' },
    )
  }
  const setAdmin = async (payload: SetAdminInput) => {
    const res = await run(
      () => $api<UserType>('/api/user/admin', { method: 'PUT', body: payload }),
      { success: 'Successfully set user as an admin!' },
    )
    if (res.ok) currentUser.value = res.data
  }

  return {
    currentUser,
    sessionExpired,
    isAuthenticated,
    role,
    isAdmin,
    isManagerOrUp,
    ensureAuth,
    loginWithCredential,
    signupUser,
    updateUsername,
    updatePassword,
    setAdmin,
    logoutUser,
    expireSession,
  }
})
