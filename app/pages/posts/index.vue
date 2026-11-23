<script setup lang="ts">
import { useRequestURL } from '#app'
import { LIMIT_MESSAGES, LIMITS, UPLOAD_MESSAGES } from '#shared/dto/limits'
import LoadMoreStatus from '@/components/posts/LoadMoreStatus.vue'
import { ImageUrl } from '@/composables/useImageUrl'
import { useAlertStore, usePostStore, useUserStore } from '@/stores'
import { Modal } from '@bobbykim/manguito-theme'
import { MclFormGroup, MclInputFile, MclTextArea } from '@bobbykim/mcl-forms'
import { UploadError } from '@/utils/fitImage'
import { prepareUpload } from '@/utils/prepareUpload'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

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
const { isManagerOrUp: isAuthorizedUser } = storeToRefs(userStore)
const imageFileRef = ref<File | undefined>(undefined)
const contentRef = ref<string>('')
const modalRef = ref<InstanceType<typeof Modal>>()
// page one renders on the server; later pages load as the grid scrolls
await postStore.loadFirstPage()
const formatPostUrl = (id: string) => {
  const imgUrl = new ImageUrl(id)
  return imgUrl.getNuxtImageCardUrl()
}
const resolveLinkPath = (id: string) => {
  return `/posts/${id}`
}
type UploadState = 'idle' | 'preparing' | 'uploading'
const uploadState = ref<UploadState>('idle')
const progress = ref<number>(0)
const busy = computed(() => uploadState.value !== 'idle')

const clearForm = () => {
  imageFileRef.value = undefined
  contentRef.value = ''
}
// closing mid-upload doesn't cancel it: the form is kept until it succeeds,
// so a failure (or reopening) finds the caption and photo as they were
const onModalClose = () => {
  if (!busy.value) clearForm()
}
const isCaptionTooLong = computed(
  () => contentRef.value.trim().length > LIMITS.caption,
)
const onSubmit = async (): Promise<void> => {
  if (busy.value || isCaptionTooLong.value) return
  if (isAuthorizedUser.value === false) return
  const picked = imageFileRef.value
  if (!picked) return
  try {
    uploadState.value = 'preparing'
    let photo: File
    try {
      photo = await prepareUpload(picked)
    } catch (err) {
      if (!(err instanceof UploadError)) console.error(err)
      alertStore.setAlert(
        err instanceof UploadError ? err.message : UPLOAD_MESSAGES.unreadable,
      )
      return
    }
    const form = new FormData()
    form.append('image', photo)
    form.append('content', contentRef.value)
    uploadState.value = 'uploading'
    const created = await postStore.createNewPost(form, {
      onProgress: (percent) => (progress.value = percent),
    })
    if (created) {
      uploadState.value = 'idle'
      clearForm()
      modalRef.value?.close()
    }
  } finally {
    uploadState.value = 'idle'
    progress.value = 0
  }
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
          class="mt-sm rounded-full bg-primary p-2xs text-light-1 transition-colors duration-300 ease-linear hover:bg-primary/70 focus-visible:mcl-focus-ring"
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
        <div v-for="post in posts" :key="post._id">
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
        <LoadMoreStatus class="col-span-3" />
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
                accept="image/jpeg,image/png,image/webp"
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
                :invalid="isCaptionTooLong"
                :invalid-feedback="LIMIT_MESSAGES.captionLong"
                required
                rounded
                show-border
              />
            </MclFormGroup>
            <div
              v-if="busy"
              class="mt-xs text-sm text-dark-1"
              aria-live="polite"
            >
              <p v-if="uploadState === 'preparing'">Preparing photo…</p>
              <template v-else-if="progress < 100">
                <div
                  role="progressbar"
                  aria-label="Upload progress"
                  :aria-valuenow="progress"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  class="h-2 w-full overflow-hidden rounded-full bg-light-3"
                >
                  <div
                    class="h-full bg-primary transition-[width] duration-200 ease-linear"
                    :style="{ width: `${progress}%` }"
                  ></div>
                </div>
                <p class="mt-3xs">Uploading… {{ progress }}%</p>
              </template>
              <p v-else>Saving…</p>
            </div>
            <div class="mt-xs flex items-center justify-end gap-2">
              <button
                type="submit"
                role="button"
                class="btn text-light-1 btn-primary"
                :disabled="isCaptionTooLong || busy"
              >
                Save
              </button>
              <button
                type="reset"
                class="btn text-light-1 btn-warning"
                :disabled="busy"
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
