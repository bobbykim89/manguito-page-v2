<script setup lang="ts">
import { useRequestURL } from '#app'
import { ImageUrl } from '@/composables/useImageUrl'
import { usePostStore, useUserStore } from '@/stores'
import { Modal, vToggle } from '@bobbykim/manguito-theme'
import { MclFormGroup, MclInputFile, MclTextArea } from '@bobbykim/mcl-forms'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

const url = useRequestURL()

useHead({
  title: 'Posts | Manguito Page',
  meta: [
    { property: 'og:title', content: 'Posts | Manguito Page' },
    { property: 'og:url', content: url.href },
    { property: 'twitter:domain', content: url.host },
    { property: 'twitter:url', content: url.href },
  ],
})

const postStore = usePostStore()
const userStore = useUserStore()
const { posts } = storeToRefs(postStore)
const { currentUser, isAuthenticated, role } = storeToRefs(userStore)
const imageFileRef = ref<File | undefined>(undefined)
const contentRef = ref<string>('')
const modalRef = ref<InstanceType<typeof Modal>>()
const postPerLoad: number = 30
const numPostsDisplayed = ref<number>(30)
const numberOfLoads = ref<number>(0)
postStore.resetCurrent()
const formatPostUrl = (id: string) => {
  const imgUrl = new ImageUrl(id)
  return imgUrl.getCardUrl()
}
const resolveLinkPath = (id: string) => {
  return `/posts/${id}`
}
const isAuthorizedUser = computed<boolean>(() => {
  if (isAuthenticated.value === false) return false
  if (currentUser.value === null) return false
  if (role.value !== 'ADMIN' && role.value !== 'MANAGER') return false
  return true
})
const displayedPost = computed(() => {
  const slicedPosts = posts.value.slice(0, numPostsDisplayed.value)
  return slicedPosts
})
const onLoadMore = () => {
  numPostsDisplayed.value = numPostsDisplayed.value + postPerLoad
  numberOfLoads.value = numberOfLoads.value + 1
}
const showLoadMore = computed(() => {
  const lastLoad = Math.floor(posts.value.length / postPerLoad)
  if (numberOfLoads.value < lastLoad) return true
  return false
})
const onModalClose = () => {
  imageFileRef.value = undefined
  contentRef.value = ''
}
const onSubmit = async (): Promise<void> => {
  const fileFormData = new FormData()
  if (isAuthorizedUser.value === false) return
  if (typeof imageFileRef.value === 'undefined') return
  fileFormData.append('image', imageFileRef.value)
  fileFormData.append('content', contentRef.value)
  await postStore.createNewPost(fileFormData)
  // reset ref data
  imageFileRef.value = undefined
  contentRef.value = ''
  // close modal
  modalRef.value?.close()
}
</script>

<template>
  <div class="container font-inter">
    <div class="max-w-screen-lg mx-auto pt-md pb-lg">
      <div class="flex flex-col justify-center items-center mb-md">
        <h2 class="h2-md font-light text-center">Enjoy the gallery!</h2>
        <!-- toggle modal -->
        <button
          v-if="isAuthorizedUser"
          class="bg-primary p-2xs rounded-full text-light-1 mt-sm hover:bg-opacity-70 transition-colors duration-300 ease-linear"
          v-toggle:new-post-modal
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 448 512"
            fill="currentColor"
            class="w-sm aspect-square"
          >
            <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
            <path
              d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"
            />
          </svg>
        </button>
      </div>
      <div class="grid grid-cols-3 gap-1 lg:gap-2 px-3xs md:px-xs lg:px-md">
        <!-- cards -->
        <div v-for="(post, idx) in displayedPost" :key="idx">
          <NuxtLink :to="resolveLinkPath(post._id as string)" class="relative">
            <img
              :src="formatPostUrl(post.imageId)"
              alt="image card"
              class="absolute aspect-square w-full object-center object-cover"
            />
            <div
              class="aspect-square w-full h-full relative bg-primary opacity-0 hover:opacity-30 transition-opacity duration-300 ease-linear"
            ></div>
          </NuxtLink>
        </div>
        <div v-if="showLoadMore" class="col-span-3">
          <button
            class="px-xs py-2xs w-full bg-primary hover:bg-opacity-60 text-light-1 font-semibold transition-colors duration-300 ease-linear"
            @click="onLoadMore"
          >
            Load More
          </button>
        </div>
      </div>
    </div>
    <Modal
      ref="modalRef"
      id="new-post-modal"
      backdrop-color="dark-3"
      title="New post"
      :class-name="['rounded-lg']"
      @close="onModalClose"
    >
      <template #body="{ close }">
        <div class="px-xs pb-xs">
          <form @submit.prevent="onSubmit">
            <MclFormGroup label-for="file-input">
              <MclInputFile
                id="file-input"
                v-model="imageFileRef"
                rounded
                is-required
                button-text="Browse"
                button-color="primary"
                button-text-color="light-1"
                display-border
              />
            </MclFormGroup>
            <MclFormGroup label-for="content-input">
              <MclTextArea
                id="content-input"
                v-model="contentRef"
                required
                rounded
                display-border
              />
            </MclFormGroup>
            <div class="flex justify-end items-center gap-2 mt-xs">
              <button
                type="submit"
                role="button"
                class="btn btn-primary text-light-1"
              >
                Save
              </button>
              <button
                type="reset"
                class="btn btn-warning text-light-1"
                @click="close"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped></style>
