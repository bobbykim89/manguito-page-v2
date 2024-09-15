import { useAuthToken } from '@/composables/useAuthToken'
import { type UpdatePostInput } from '@/server/controller/post/dto'
import { PopulatedPostModel } from '@/server/models'
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

  // POST: getters
  const getRecentPosts = computed<PopulatedPostModel[]>(() => {
    return posts.value.slice(0, 7)
  })

  // POST: actions
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
    for (let i = 0; i < posts.value.length - 1; i++) {
      if (posts.value[i]._id === postId) {
        currentPost.value = posts.value[i]
        postIdx.value = i
      }
    }
  }
  const setNextPost = () => {
    if (postIdx.value < posts.value.length - 1) {
      postIdx.value += 1
    }
    if (postIdx.value === posts.value.length - 1) {
      postIdx.value = 0
    }
    currentPost.value = posts.value[postIdx.value]
  }
  const setPrevPost = () => {
    if (postIdx.value > 0) {
      postIdx.value -= 1
    }
    if (postIdx.value === 0) {
      postIdx.value = posts.value.length - 1
    }
    currentPost.value = posts.value[postIdx.value]
  }
  const createNewPost = async (payload: FormData) => {
    const { currentUser, isAuthenticated } = userStore.getCurrentAuthInfo
    if (!cookie.value || !isAuthenticated) {
      alertStore.setAlert('No user authentication found, please login')
      return
    }
    if (!currentUser?.admin) {
      alertStore.setAlert('Unauthorized action for current user')
      return
    }
    const { data: res } = await useFetch<PopulatedPostModel>('/api/post', {
      method: 'POST',
      headers: { Authorization: cookie.value },
      body: payload,
    })
    if (!res.value) {
      alertStore.setAlert(
        'Failed to get response from server, please try again'
      )
      return
    }
    posts.value = [res.value, ...posts.value]
    alertStore.setAlert('Successfully created a new post', 'success')
  }
  const updatePost = async (postId: string, payload: UpdatePostInput) => {
    const { isAuthenticated, currentUser } = userStore.getCurrentAuthInfo
    if (!cookie.value || !isAuthenticated) {
      alertStore.setAlert('No user authentication found, please login')
      return
    }
    const currentPost = posts.value.find((item) => item._id === postId)
    if (currentPost?.author._id !== currentUser?._id || !currentUser?.admin) {
      alertStore.setAlert('Unauthorized user')
      return
    }
    const { data: res } = await useFetch<PopulatedPostModel>(
      `/api/post/${postId}`,
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
    posts.value = posts.value.map((post) =>
      post._id === postId ? res.value! : post
    )
    alertStore.setAlert('Successfully updated post!', 'success')
  }
  const deletePostById = async (postId: string) => {
    const { isAuthenticated, currentUser } = userStore.getCurrentAuthInfo
    if (!cookie.value || !isAuthenticated) {
      alertStore.setAlert('No user authentication found, please login')
      return
    }
    const currentPost = posts.value.find((item) => item._id === postId)
    if (currentPost?.author._id !== currentUser?._id || !currentUser?.admin) {
      alertStore.setAlert('Unauthorized user')
      return
    }
    const { data: res } = await useFetch(`/api/post/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: cookie.value },
    })
    if (!res.value) {
      alertStore.setAlert(
        'Failed to get response from server, please try again'
      )
      return
    }
    posts.value = posts.value.filter((post) => post._id !== postId)
  }
  return {
    posts,
    currentPost,
    postIdx,
    getRecentPosts,
    getAllPosts,
    setCurrentPost,
    setNextPost,
    setPrevPost,
    createNewPost,
    updatePost,
    deletePostById,
  }
})
