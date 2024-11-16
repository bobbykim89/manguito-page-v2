import { navigateTo } from '#app'
import { useAuthToken } from '@/composables/useAuthToken'
import { type UpdatePostInput } from '@/server/controller/post/dto'
import { PopulatedPostModel } from '@/server/models'
import { H3Error } from 'h3'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAlertStore } from './alertStore'
import { useUserStore } from './userStore'

export const usePostStore = defineStore('post', () => {
  const alertStore = useAlertStore()
  const userStore = useUserStore()
  const cookie = useAuthToken()
  // POST: states
  const posts = ref<PopulatedPostModel[]>([])
  const currentPost = ref<PopulatedPostModel | null>(null)
  const postIdx = ref<number>(0)
  const postLoading = ref<boolean>(false)

  // POST: getters
  const getRecentPosts = computed<PopulatedPostModel[]>(() => {
    return posts.value.slice(0, 7)
  })

  // POST: actions
  const setPostLoadnigTimeout = () => {
    postLoading.value = true
    setTimeout(() => {
      postLoading.value = false
    }, 500)
  }
  const getAllPosts = async () => {
    const { data: res } = await useFetch<PopulatedPostModel[]>('/api/post', {
      method: 'GET',
    })
    if (!res.value) {
      alertStore.setAlert(
        'Failed to get response from server, please try again'
      )
      return
    }
    posts.value = res.value
  }
  const setCurrentPost = (postId: string) => {
    setPostLoadnigTimeout()
    for (let i = 0; i < posts.value.length; i++) {
      if (posts.value[i]._id.toString() === postId) {
        currentPost.value = posts.value[i]
        postIdx.value = i
      }
    }
    if (currentPost.value === null) {
      alertStore.setAlert('Error: Invalid Post ID ')
      setTimeout(() => {
        return navigateTo('/posts')
      }, 500)
    }
  }
  const setNextPost = (): string => {
    setPostLoadnigTimeout()
    let postId: string = '/posts'
    if (postIdx.value < posts.value.length - 1) {
      postId = posts.value[postIdx.value + 1]._id.toString()
    }
    if (postIdx.value === posts.value.length - 1) {
      postId = posts.value[0]._id.toString()
    }
    return `/posts/${postId}`
  }
  const setPrevPost = (): string => {
    setPostLoadnigTimeout()
    let postId: string = '/posts'
    if (postIdx.value > 0) {
      postId = posts.value[postIdx.value - 1]._id.toString()
    }
    if (postIdx.value === 0) {
      postId = posts.value[posts.value.length - 1]._id.toString()
    }
    return `/posts/${postId}`
  }
  const resetCurrent = () => {
    currentPost.value = null
    postIdx.value = 0
    postLoading.value = false
  }
  const createNewPost = async (payload: FormData) => {
    const { isAuthenticated, role } = userStore.getCurrentAuthInfo
    if (!cookie.value || !isAuthenticated) {
      alertStore.setAlert('No user authentication found, please login')
      return
    }
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      alertStore.setAlert('Unauthorized action for current user')
      return
    }
    try {
      const res = await $fetch<PopulatedPostModel>('/api/post', {
        method: 'POST',
        headers: { Authorization: cookie.value },
        body: payload,
      })
      posts.value = [res, ...posts.value]
      alertStore.setAlert('Successfully created a new post', 'success')
    } catch (error) {
      alertStore.setAlert((error as H3Error).statusMessage!)
    }
  }
  const updatePost = async (postId: string, payload: UpdatePostInput) => {
    const { isAuthenticated, currentUser } = userStore.getCurrentAuthInfo
    if (!cookie.value || !isAuthenticated) {
      alertStore.setAlert('No user authentication found, please login')
      return
    }
    const currentPost = posts.value.find(
      (item) => item._id.toString() === postId
    )
    if (currentPost?.author._id !== currentUser?._id) {
      alertStore.setAlert('Unauthorized user')
      return
    }
    try {
      const res = await $fetch<PopulatedPostModel>(`/api/post/${postId}`, {
        method: 'PUT',
        headers: { Authorization: cookie.value },
        body: payload,
      })
      posts.value = posts.value.map((post) =>
        post._id.toString() === postId ? res : post
      )
      alertStore.setAlert('Successfully updated post!', 'success')
    } catch (error) {
      alertStore.setAlert((error as H3Error).statusMessage!)
    }
  }
  const deletePostById = async (postId: string) => {
    const { isAuthenticated, currentUser, role } = userStore.getCurrentAuthInfo
    if (!cookie.value || !isAuthenticated) {
      alertStore.setAlert('No user authentication found, please login')
      return
    }
    const currentPost = posts.value.find(
      (item) => item._id.toString() === postId
    )
    if (currentPost?.author._id !== currentUser?._id && role !== 'ADMIN') {
      alertStore.setAlert('Unauthorized user')
      return
    }
    try {
      await $fetch(`/api/post/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: cookie.value },
      })
      posts.value = posts.value.filter((post) => post._id.toString() !== postId)
      alertStore.setAlert('Successfully deleted post!', 'success')
    } catch (error) {
      alertStore.setAlert((error as H3Error).statusMessage!)
    }
  }
  return {
    posts,
    currentPost,
    postIdx,
    getRecentPosts,
    postLoading,
    getAllPosts,
    setCurrentPost,
    setNextPost,
    setPrevPost,
    resetCurrent,
    createNewPost,
    updatePost,
    deletePostById,
  }
})
