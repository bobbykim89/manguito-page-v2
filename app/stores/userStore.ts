import { type AuthInput } from '#shared/dto/auth'
import type {
  NewUsernameInput,
  PwUpdateInput,
  SetAdminInput,
  UserInput,
} from '#shared/dto/user'
import type { UserRoleType } from '#shared/models'
import type { UserType } from '#shared/types'
import { useAuthToken } from '@/composables/useAuthToken'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAlertStore } from './alertStore'

const NO_SESSION = 'No user authentication found, please login'

interface AuthToken {
  accessToken: string
}

export const useUserStore = defineStore('user', () => {
  const errorCheck = useErrorCheck()
  const alertStore = useAlertStore()
  const cookie = useAuthToken()
  const { $api } = useNuxtApp()
  // USERS: states
  const currentUser = ref<UserType | null>(null)
  const isAuthenticated = ref<boolean>(false)
  const role = ref<UserRoleType | null>(null)
  // true once a sent session cookie was rejected with 401 (expired or stale)
  const sessionExpired = ref<boolean>(false)
  // the startup auth check, shared by init and route guards; kept out of
  // state so it never serializes into the payload
  let authCheck: Promise<void> | null = null

  // USERS: getters
  const getCurrentAuthInfo = computed(() => {
    return {
      currentUser: currentUser.value,
      isAuthenticated: isAuthenticated.value,
      role: role.value,
    }
  })

  // USERS: actions
  const authUser = async () => {
    try {
      if (!cookie.value) return alertNoSession()

      const res = await $api<UserType>('/api/auth', {
        method: 'GET',
      })
      currentUser.value = res
      isAuthenticated.value = true
      role.value = res.role
    } catch (error) {
      handleAuthError(error)
    }
  }
  const getCurrentUser = async () => {
    try {
      if (!cookie.value) return

      const res = await $api<UserType>('/api/auth', {
        method: 'GET',
      })
      currentUser.value = res
      isAuthenticated.value = true
      role.value = res.role
      alertStore.setAlert('Successfully authenticated user', 'success')
    } catch (error) {
      // only UNAUTHENTICATED ends the session (handleAuthError does that)
      handleAuthError(error, true)
    }
  }
  const loginWithCredential = async (payload: AuthInput) => {
    try {
      const res = await $api<AuthToken>('/api/auth', {
        method: 'POST',
        body: payload,
      })
      cookie.value = res.accessToken
      await authUser()
      alertStore.setAlert('Login Successful!', 'success')
    } catch (error) {
      handleAuthError(error)
    }
  }
  const signupUser = async (payload: UserInput) => {
    try {
      const res = await $api<AuthToken>('/api/user', {
        method: 'POST',
        body: payload,
      })
      cookie.value = res.accessToken
      await authUser()
      alertStore.setAlert('Signup successful!', 'success')
    } catch (error) {
      handleAuthError(error)
    }
  }
  const updateUsername = async (payload: NewUsernameInput) => {
    try {
      if (!cookie.value) return alertNoSession()

      await $api<UserType>('/api/user/user-info/username', {
        method: 'PUT',
        body: payload,
      })
      await authUser()
      alertStore.setAlert('Successfully updated username', 'success')
    } catch (error) {
      handleAuthError(error)
    }
  }
  const updatePassword = async (payload: PwUpdateInput) => {
    try {
      if (!cookie.value) return alertNoSession()

      await $api('/api/user/user-info/password', {
        method: 'PUT',
        body: payload,
      })
      await authUser()
      alertStore.setAlert('Successfully updated user password', 'success')
    } catch (error) {
      handleAuthError(error)
    }
  }
  const logoutUser = () => {
    cookie.value = null
    currentUser.value = null
    isAuthenticated.value = false
    role.value = null
    alertStore.setAlert('Logout successful!', 'success')
  }
  const setAdmin = async (payload: SetAdminInput) => {
    try {
      if (!cookie.value) return alertNoSession()

      await $api<UserType>('/api/user/admin', {
        method: 'PUT',
        body: payload,
      })
      await authUser()
      alertStore.setAlert('Successfully set user as an admin!', 'success')
    } catch (error) {
      handleAuthError(error)
    }
  }
  // quiet: the startup session check, where a rejected cookie logs out silently
  // the session is gone: log out; guards send protected pages to login
  const expireSession = () => {
    cookie.value = null
    currentUser.value = null
    isAuthenticated.value = false
    role.value = null
    sessionExpired.value = true
  }
  const alertNoSession = () => {
    alertStore.setAlert(NO_SESSION)
  }
  // quiet: the startup session check, where a dead session logs out silently.
  // Only UNAUTHENTICATED ends the session; a refusal or a wrong password
  // (FORBIDDEN, INVALID_CREDENTIALS) only alerts.
  const handleAuthError = (err: unknown, quiet = false) => {
    const errorMessage: string = errorCheck.extractMessage(err)
    if (errorCheck.isAuthError(err)) {
      expireSession()
      if (quiet) return
    }
    console.error(errorMessage)
    alertStore.setAlert(errorMessage)
  }

  const ensureAuth = (): Promise<void> => {
    authCheck ??= getCurrentUser()
    return authCheck
  }
  return {
    currentUser,
    isAuthenticated,
    role,
    getCurrentAuthInfo,
    sessionExpired,
    getCurrentUser,
    ensureAuth,
    loginWithCredential,
    signupUser,
    updateUsername,
    updatePassword,
    logoutUser,
    setAdmin,
    expireSession,
  }
})
