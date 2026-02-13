import { navigateTo } from '#app'
import { type UpdatePostInput } from '#shared/dto/post'
import { PostType } from '#shared/types'
import { useAuthToken } from '@/composables/useAuthToken'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAlertStore } from './alertStore'
import { useUserStore } from './userStore'

export const usePostStore = defineStore('post', () => {
  const errorCheck = useErrorCheck()
  const alertStore = useAlertStore()
  const userStore = useUserStore()
  const cookie = useAuthToken()
  // POST: states
  const posts = ref<PostType[]>([])
  const currentPost = ref<PostType | null>(null)
  const postIdx = ref<number>(0)
  const postLoading = ref<boolean>(false)

  // POST: getters
  const getRecentPosts = computed<PostType[]>(() => {
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
    try {
      const { data: res } = await useFetch<PostType[]>('/api/post', {
        method: 'GET',
      })
      if (!res.value)
        throw new Error('Failed to get response from server, please try again')

      posts.value = res.value
    } catch (error) {
      handlePostError(error)
    }
  }
  const setCurrentPost = (postId: string) => {
    setPostLoadnigTimeout()

    for (let i = 0; i < posts.value.length; i++) {
      const post = posts.value[i]
      if (post && post._id === postId) {
        currentPost.value = post
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

    const basePath: string = '/posts'
    if (posts.value.length === 0) return basePath
    const nextIdx = (postIdx.value + 1) % posts.value.length
    const targetPost = posts.value[nextIdx]
    return targetPost ? `${basePath}/${targetPost._id}` : basePath
    // let postId: string = ''
    // if (postIdx.value < posts.value.length - 1) {
    //   const targetPost = posts.value[postIdx.value + 1]
    //   postId = targetPost ? targetPost._id : ''
    // }
    // if (postIdx.value === posts.value.length - 1) {
    //   const targetPost = posts.value[0]
    //   postId = targetPost ? targetPost._id : ''
    // }
    // return `/posts/${postId}`
  }
  const setPrevPost = (): string => {
    setPostLoadnigTimeout()
    const basePath: string = '/posts'
    if (posts.value.length === 0) return basePath

    const prevIdx =
      (postIdx.value - 1 + posts.value.length) % posts.value.length
    const targetPost = posts.value[prevIdx]
    return targetPost ? `${basePath}/${targetPost._id}` : basePath
    // let postId: string = ''
    // if (postIdx.value > 0) {
    //   const targetPost = posts.value[postIdx.value - 1]
    //   postId = targetPost ? targetPost._id : ''
    // }
    // if (postIdx.value === 0) {
    //   const targetPost = posts.value[posts.value.length - 1]
    //   postId = targetPost ? targetPost._id : ''
    // }
    // return `/posts/${postId}`
  }
  const resetCurrent = () => {
    currentPost.value = null
    postIdx.value = 0
    postLoading.value = false
  }
  const createNewPost = async (payload: FormData) => {
    try {
      const { isAuthenticated, role } = userStore.getCurrentAuthInfo
      if (!cookie.value || !isAuthenticated)
        throw new Error('No user authentication found, please login')

      if (role !== 'ADMIN' && role !== 'MANAGER')
        throw new Error('Unauthorized action for current user')

      const res = await $fetch<PostType>('/api/post', {
        method: 'POST',
        headers: { Authorization: cookie.value },
        body: payload,
      })
      posts.value = [res, ...posts.value]
      alertStore.setAlert('Successfully created a new post', 'success')
    } catch (error) {
      handlePostError(error)
    }
  }
  const updatePost = async (postId: string, payload: UpdatePostInput) => {
    try {
      const { isAuthenticated, currentUser } = userStore.getCurrentAuthInfo
      if (!cookie.value || !isAuthenticated)
        throw new Error('No user authentication found, please login')

      const currentPost = posts.value.find(
        (item) => item._id.toString() === postId,
      )
      if (currentPost?.author._id !== currentUser?._id)
        throw new Error('Unauthorized user')

      const res = await $fetch<PostType>(`/api/post/${postId}`, {
        method: 'PUT',
        headers: { Authorization: cookie.value },
        body: payload,
      })
      posts.value = posts.value.map((post) =>
        post._id.toString() === postId ? res : post,
      )
      alertStore.setAlert('Successfully updated post!', 'success')
    } catch (error) {
      handlePostError(error)
    }
  }
  const deletePostById = async (postId: string) => {
    try {
      const { isAuthenticated, currentUser, role } =
        userStore.getCurrentAuthInfo
      if (!cookie.value || !isAuthenticated)
        throw new Error('No user authentication found, please login')

      const currentPost = posts.value.find(
        (item) => item._id.toString() === postId,
      )
      if (currentPost?.author._id !== currentUser?._id && role !== 'ADMIN')
        throw new Error('Unauthorized user')

      await $fetch(`/api/post/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: cookie.value },
      })
      posts.value = posts.value.filter((post) => post._id.toString() !== postId)
      alertStore.setAlert('Successfully deleted post!', 'success')
    } catch (error) {
      handlePostError(error)
    }
  }
  const handlePostError = (err: unknown) => {
    const errorMessage: string = errorCheck.extractMessage(err)

    console.error(errorMessage)
    alertStore.setAlert(errorMessage)
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
