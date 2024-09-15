import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePostStore } from './postStore'
import { useUserStore } from './userStore'

export const useInitStore = defineStore('init', () => {
  const postStore = usePostStore()
  const userStore = useUserStore()
  // INIT: states
  const loading = ref<boolean>(true)
  const isMounted = ref<boolean>(false)
  // INIT: actions
  const setLoading = (val: boolean) => {
    loading.value = val
  }
  const initStores = async () => {
    setLoading(true)
    await postStore.getAllPosts()
    await userStore.getCurrentUser()
    setLoading(false)
    isMounted.value = true
  }
  return {
    loading,
    isMounted,
    initStores,
  }
})
