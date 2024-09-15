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
  // USERS: getters
  const getCurrentAuthInfo = computed(() => {
    return {
      currentUser: currentUser.value,
      isAuthenticated: isAuthenticated.value,
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
    } catch (error) {
      if (error instanceof H3Error) {
        alertStore.setAlert(error.data.statusMessage)
        currentUser.value = null
        isAuthenticated.value = false
      }
    }
  }
  const getCurrentUser = async () => {
    if (!cookie.value) return
    try {
      const res = await $fetch<UserModel>('/api/auth', {
        method: 'GET',
        headers: { Authorization: cookie.value },
        ignoreResponseError: true,
      })
      currentUser.value = res
      isAuthenticated.value = true
      alertStore.setAlert('Successfully authenticated user', 'success')
    } catch (error) {
      if (error instanceof H3Error) {
        alertStore.setAlert(error.data.statusMessage)
        currentUser.value = null
        isAuthenticated.value = false
      }
    }
  }
  const loginWithCredential = async (payload: AuthInput) => {
    const { data: res, error } = await useFetch<AuthToken>('/api/auth', {
      method: 'POST',
      body: payload,
    })
    if (error.value) {
      alertStore.setAlert(error.value.data.statusMessage)
      currentUser.value = null
      isAuthenticated.value = false
      return
    }
    if (!res.value) {
      alertStore.setAlert(
        'Failed to get response from server, please try again'
      )
      currentUser.value = null
      isAuthenticated.value = false
      return
    }
    cookie.value = res.value.access_token
    await authUser()
    alertStore.setAlert('Login Successful!', 'success')
  }
  const signupUser = async (payload: UserInput) => {
    const { data: res, error } = await useFetch<AuthToken>('/api/user', {
      method: 'POST',
      body: payload,
    })
    if (error.value) {
      alertStore.setAlert(error.value.data.statusMessage)
      currentUser.value = null
      isAuthenticated.value = false
      return
    }
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
    const { data: res, error } = await useFetch<UserModel>(
      '/api/user/user-info/username',
      {
        method: 'PUT',
        headers: { Authorization: cookie.value },
        body: payload,
      }
    )
    if (error.value) {
      alertStore.setAlert(error.value.data.statusMessage)
      return
    }
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
    const { data: res, error } = await useFetch(
      '/api/user/user-info/password',
      {
        method: 'PUT',
        headers: { Authentication: cookie.value },
        body: payload,
      }
    )
    if (error.value) {
      alertStore.setAlert(error.value.data.statusMessage)
      return
    }
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
    const { data: res, error } = await useFetch<UserModel>(
      '/api/user/user-role/admin',
      {
        method: 'PUT',
        headers: { Authentication: cookie.value },
        body: payload,
      }
    )
    if (error.value) {
      alertStore.setAlert(error.value.data.statusMessage)
      return
    }
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
