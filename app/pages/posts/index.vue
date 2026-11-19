<script setup lang="ts">
import { useRequestURL } from '#app'
import { ImageUrl } from '@/composables/useImageUrl'
import { useAlertStore, usePostStore, useUserStore } from '@/stores'
import { Modal } from '@bobbykim/manguito-theme'
import { MclFormGroup, MclInputFile, MclTextArea } from '@bobbykim/mcl-forms'
import imageCompression from 'browser-image-compression'
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
    {
      name: 'twitter:title',
      content: 'Posts | Manguito Page',
    },
  ],
})

const postStore = usePostStore()
const userStore = useUserStore()
const alertStore = useAlertStore()
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
  return imgUrl.getNuxtImageCardUrl()
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
  try {
    const compressedFile = await imageCompression(imageFileRef.value, {
      maxSizeMB: 2,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    })
    const postCompressionFileInfo = {
      fileName: compressedFile.name,
      size: compressedFile.size / 1024 / 1024,
      type: compressedFile.type,
    }
    fileFormData.append('image', compressedFile)
    fileFormData.append('content', contentRef.value)
    console.info(postCompressionFileInfo)
    await postStore.createNewPost(fileFormData)
    // reset ref data
    imageFileRef.value = undefined
    contentRef.value = ''
  } catch (err) {
    alertStore.setAlert(
      // 'An error occurred while uploading image, please try again'
      (err as Error).message,
    )
    console.error(err)
  }
  // close modal
  modalRef.value?.close()
}
</script>

<template>
  <div class="font-inter container">
    <div class="mx-auto max-w-screen-lg pt-md pb-lg">
      <div class="mb-md flex flex-col items-center justify-center">
        <h2 class="h2-md text-center font-light">Enjoy the gallery!</h2>
        <!-- toggle modal -->
        <button
          v-if="isAuthorizedUser"
          class="mt-sm rounded-full bg-primary p-2xs text-light-1 transition-colors duration-300 ease-linear hover:bg-primary/70"
          @click="modalRef?.open()"
          aria-label="new post"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 448 512"
            fill="currentColor"
            class="aspect-square w-sm"
          >
            <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
            <path
              d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"
            />
          </svg>
        </button>
      </div>
      <div class="grid grid-cols-3 gap-1 px-3xs md:px-xs lg:gap-2 lg:px-md">
        <!-- cards -->
        <div v-for="(post, idx) in displayedPost" :key="idx">
          <NuxtLink
            :to="resolveLinkPath(post._id.toString())"
            class="relative aspect-square h-auto w-full overflow-hidden after:absolute after:inset-0 after:bg-primary after:opacity-0 after:transition-opacity after:duration-300 after:ease-linear hover:after:opacity-30"
          >
            <NuxtImg
              provider="cloudinary"
              :src="formatPostUrl(post.imageId)"
              alt="image card"
              class="relative z-0 aspect-square w-full object-cover object-center"
              loading="lazy"
            />
          </NuxtLink>
        </div>
        <div v-if="showLoadMore" class="col-span-3">
          <button
            class="w-full bg-primary px-xs py-2xs font-semibold text-light-1 transition-colors duration-300 ease-linear hover:bg-primary/60"
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
      custom-class="rounded-lg"
      @close="onModalClose"
    >
      <template #body="{ close }">
        <div class="px-xs pb-xs">
          <form @submit.prevent="onSubmit">
            <MclFormGroup field-id="file-input" class="mt-sm">
              <MclInputFile
                id="file-input"
                v-model="imageFileRef"
                rounded
                required
                button-text="Browse"
                button-color="primary"
                button-text-color="light-1"
                show-border
              />
            </MclFormGroup>
            <MclFormGroup field-id="content-input" class="mt-sm">
              <MclTextArea
                id="content-input"
                v-model="contentRef"
                required
                rounded
                show-border
              />
            </MclFormGroup>
            <div class="mt-xs flex items-center justify-end gap-2">
              <button
                type="submit"
                role="button"
                class="btn text-light-1 btn-primary"
              >
                Save
              </button>
              <button
                type="reset"
                class="btn text-light-1 btn-warning"
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
