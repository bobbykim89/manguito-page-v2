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

interface AuthToken {
  access_token: string
}

export const useUserStore = defineStore('user', () => {
  const errorCheck = useErrorCheck()
  const alertStore = useAlertStore()
  const cookie = useAuthToken()
  // USERS: states
  const currentUser = ref<UserType | null>(null)
  const isAuthenticated = ref<boolean>(false)
  const role = ref<UserRoleType | null>(null)

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
      if (!cookie.value)
        throw new Error('No user authentication found, please login')

      const res = await $fetch<UserType>('/api/auth', {
        method: 'GET',
        headers: { Authorization: cookie.value },
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
      if (!cookie.value)
        throw new Error('No user authentication found, please login')

      const res = await $fetch<UserType>('/api/auth', {
        method: 'GET',
        headers: { Authorization: cookie.value },
      })
      currentUser.value = res
      isAuthenticated.value = true
      role.value = res.role
      alertStore.setAlert('Successfully authenticated user', 'success')
    } catch (error) {
      handleAuthError(error)
      cookie.value = null
    }
  }
  const loginWithCredential = async (payload: AuthInput) => {
    try {
      const res = await $fetch<AuthToken>('/api/auth', {
        method: 'POST',
        body: payload,
      })
      cookie.value = res.access_token
      await authUser()
      alertStore.setAlert('Login Successful!', 'success')
    } catch (error) {
      handleAuthError(error)
    }
  }
  const signupUser = async (payload: UserInput) => {
    try {
      const res = await $fetch<AuthToken>('/api/user', {
        method: 'POST',
        body: payload,
      })
      cookie.value = res.access_token
      await authUser()
      alertStore.setAlert('Signup successful!', 'success')
    } catch (error) {
      handleAuthError(error)
    }
  }
  const updateUsername = async (payload: NewUsernameInput) => {
    try {
      if (!cookie.value)
        throw new Error('No user authentication found, please login')

      await $fetch<UserType>('/api/user/user-info/username', {
        method: 'PUT',
        headers: { Authorization: cookie.value },
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
      if (!cookie.value)
        throw new Error('No user authentication found, please login')

      await $fetch('/api/user/user-info/password', {
        method: 'PUT',
        headers: { Authorization: cookie.value },
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
      if (!cookie.value)
        throw new Error('No user authentication found, please login')

      await $fetch<UserType>('/api/user/admin', {
        method: 'PUT',
        headers: { Authorization: cookie.value },
        body: payload,
      })
      await authUser()
      alertStore.setAlert('Successfully set user as an admin!', 'success')
    } catch (error) {
      handleAuthError(error)
    }
  }
  const handleAuthError = (err: unknown) => {
    const errorMessage: string = errorCheck.extractMessage(err)
    const checkAuthError: boolean = errorCheck.isAuthError(err)
    if (checkAuthError) {
      currentUser.value = null
      isAuthenticated.value = false
      role.value = null
    }
    console.error(errorMessage)
    alertStore.setAlert(errorMessage)
  }
  return {
    currentUser,
    isAuthenticated,
    role,
    getCurrentAuthInfo,
    getCurrentUser,
    loginWithCredential,
    signupUser,
    updateUsername,
    updatePassword,
    logoutUser,
    setAdmin,
  }
})
