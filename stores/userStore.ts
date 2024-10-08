import { useAuthToken } from '@/composables/useAuthToken'
import { type AuthInput } from '@/server/controller/auth/dto'
import type {
  NewUsernameInput,
  PwUpdateInput,
  SetAdminInput,
  UserInput,
} from '@/server/controller/user/dto'
import { UserModel, UserRoleType } from '@/server/models'
import { H3Error } from 'h3'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAlertStore } from './alertStore'

interface AuthToken {
  access_token: string
}

export const useUserStore = defineStore('user', () => {
  const alertStore = useAlertStore()
  const cookie = useAuthToken()
  // USERS: states
  const currentUser = ref<UserModel | null>(null)
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
    if (!cookie.value) return
    try {
      const res = await $fetch<UserModel>('/api/auth', {
        method: 'GET',
        headers: { Authorization: cookie.value },
      })
      currentUser.value = res
      isAuthenticated.value = true
      role.value = res.role
    } catch (error) {
      alertStore.setAlert((error as H3Error).statusMessage!)
      currentUser.value = null
      isAuthenticated.value = false
      role.value = null
    }
  }
  const getCurrentUser = async () => {
    if (!cookie.value) return
    try {
      const res = await $fetch<UserModel>('/api/auth', {
        method: 'GET',
        headers: { Authorization: cookie.value },
      })
      currentUser.value = res
      isAuthenticated.value = true
      role.value = res.role
      alertStore.setAlert('Successfully authenticated user', 'success')
    } catch (error) {
      alertStore.setAlert((error as H3Error).statusMessage!)
      currentUser.value = null
      isAuthenticated.value = false
      role.value = null
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
      alertStore.setAlert((error as H3Error).statusMessage!)
      currentUser.value = null
      isAuthenticated.value = false
      role.value = null
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
      alertStore.setAlert((error as H3Error).statusMessage!)
      currentUser.value = null
      isAuthenticated.value = false
      role.value = null
    }
  }
  const updateUsername = async (payload: NewUsernameInput) => {
    if (!cookie.value) return
    try {
      await $fetch<UserModel>('/api/user/user-info/username', {
        method: 'PUT',
        headers: { Authorization: cookie.value },
        body: payload,
      })
      await authUser()
      alertStore.setAlert('Successfully updated username', 'success')
    } catch (error) {
      alertStore.setAlert((error as H3Error).statusMessage!)
    }
  }
  const updatePassword = async (payload: PwUpdateInput) => {
    if (!cookie.value) return
    try {
      await $fetch('/api/user/user-info/password', {
        method: 'PUT',
        headers: { Authorization: cookie.value },
        body: payload,
      })
      await authUser()
      alertStore.setAlert('Successfully updated user password', 'success')
    } catch (error) {
      alertStore.setAlert((error as H3Error).statusMessage!)
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
    if (!cookie.value) return
    try {
      await $fetch<UserModel>('/api/user/admin', {
        method: 'PUT',
        headers: { Authorization: cookie.value },
        body: payload,
      })
      await authUser()
      alertStore.setAlert('Successfully set user as an admin!', 'success')
    } catch (error) {
      alertStore.setAlert((error as H3Error).statusMessage!)
    }
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
