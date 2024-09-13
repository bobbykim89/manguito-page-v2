import { useFetch } from '#imports'
import { useAuthToken } from '@/composables/useAuthToken'
import { type AuthInput } from '@/server/controller/auth/dto'
import type {
  NewUsernameInput,
  PwUpdateInput,
  SetAdminInput,
  UserInput,
} from '@/server/controller/user/dto'
import { UserModel } from '@/server/models'
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
  // USERS: getters
  const getCurrentAuthInfo = computed(() => {
    return {
      currentUser: currentUser.value,
      isAuthenticated: isAuthenticated.value,
    }
  })
  // USERS: actions
  const authUser = async () => {
    if (!cookie.value) {
      return
    }
    const { data: res } = await useFetch<UserModel>('/api/auth', {
      method: 'GET',
      headers: { Authorization: cookie.value },
    })
    if (!res.value) {
      currentUser.value = null
      isAuthenticated.value = false
      return
    }
    currentUser.value = res.value
    isAuthenticated.value = true
  }
  const getCurrentUser = async () => {
    await authUser()
    alertStore.setAlert('Successfully authenticated user', 'success')
  }
  const loginWithCredential = async (payload: AuthInput) => {
    const { data: res } = await useFetch<AuthToken>('/api/auth', {
      method: 'POST',
      body: payload,
    })
    if (!res.value) {
      alertStore.setAlert("Couldn't fetch user info from setver")
      currentUser.value = null
      isAuthenticated.value = false
      return
    }
    cookie.value = res.value.access_token
    await authUser()
    alertStore.setAlert('Login Successful!', 'success')
  }
  const signupUser = async (payload: UserInput) => {
    const { data: res } = await useFetch<AuthToken>('/api/user', {
      method: 'POST',
      body: payload,
    })
    if (!res.value) {
      alertStore.setAlert(
        'Failed to get response from server, please try again'
      )
      return
    }
    cookie.value = res.value.access_token
    await authUser()
    alertStore.setAlert('Signup successful!', 'success')
  }
  const updateUsername = async (payload: NewUsernameInput) => {
    if (!cookie.value) {
      return
    }
    const { data: res } = await useFetch<UserModel>(
      '/api/user/user-info/username',
      {
        method: 'PUT',
        headers: { Authorization: cookie.value },
        body: payload,
      }
    )
    if (!res.value) {
      alertStore.setAlert(
        'Failed to get response from server, please try again'
      )
      return
    }
    await authUser()
    alertStore.setAlert('Successfully updated username', 'success')
  }
  const updatePassword = async (payload: PwUpdateInput) => {
    if (!cookie.value) {
      return
    }
    const { data: res } = await useFetch('/api/user/user-info/password', {
      method: 'PUT',
      headers: { Authentication: cookie.value },
      body: payload,
    })
    if (!res.value) {
      alertStore.setAlert(
        'Failed to get response from server, please try again'
      )
      return
    }
    await authUser()
    alertStore.setAlert('Successfully updated user password', 'success')
  }
  const logoutUser = () => {
    cookie.value = null
    currentUser.value = null
    isAuthenticated.value = false
    alertStore.setAlert('Logout successful!', 'success')
  }
  const setAdmin = async (payload: SetAdminInput) => {
    if (!cookie.value) {
      return
    }
    const { data: res } = await useFetch<UserModel>(
      '/api/user/user-role/admin',
      {
        method: 'PUT',
        headers: { Authentication: cookie.value },
        body: payload,
      }
    )
    if (!res.value) {
      alertStore.setAlert(
        'Failed to get response from server, please try again'
      )
      return
    }
    await authUser()
    alertStore.setAlert('Successfully set user as an admin!', 'success')
  }
  return {
    currentUser,
    isAuthenticated,
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