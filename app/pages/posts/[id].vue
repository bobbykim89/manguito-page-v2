<script setup lang="ts">
import { useRequestURL } from '#app'
import CommentInput from '@/components/posts/CommentInput.vue'
import CommentItem from '@/components/posts/CommentItem.vue'
import ContentBlock from '@/components/posts/ContentBlock.vue'
import { PopulatedCommentModel } from '@/server/models'
import { useClipboard } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthToken } from '~/app/composables/useAuthToken'
import { ImageUrl } from '~/app/composables/useImageUrl'
import { useAlertStore, usePostStore, useUserStore } from '~/app/stores'

const route = useRoute()
const router = useRouter()
const cookie = useAuthToken()
const url = useRequestURL()
const alertStore = useAlertStore()
const postStore = usePostStore()
const userStore = useUserStore()
const { currentPost, postLoading } = storeToRefs(postStore)
const { currentUser, role, isAuthenticated } = storeToRefs(userStore)
const contentRef = ref<HTMLDivElement>()
const { copy, isSupported } = useClipboard()

postStore.setCurrentPost(route.params.id as string)

const { data: comments, refresh } = await useFetch<PopulatedCommentModel[]>(
  `/api/comment/${route.params.id}`,
  {
    method: 'GET',
  },
)

const resolveMetaImage = (img: string) => {
  const imgUrl = new ImageUrl(img)
  return imgUrl.getCardUrl()
}

useHead({
  title: 'Post | Manguito Page',
  meta: [
    { property: 'og:title', content: 'Post | Manguito Page' },
    {
      property: 'og:image',
      content: resolveMetaImage(currentPost.value?.imageId!),
    },
    { property: 'og:url', content: url.href },
    { property: 'twitter:domain', content: url.host },
    { property: 'twitter:url', content: url.href },
    {
      property: 'twitter:image',
      content: resolveMetaImage(currentPost.value?.imageId!),
    },
    {
      name: 'twitter:title',
      content: 'Post | Manguito Page',
    },
  ],
})
const handlePrevClick = () => {
  const prevPostUrl = postStore.setPrevPost()
  router.push({ path: prevPostUrl })
}
const handleNextClick = () => {
  const nextPostUrl = postStore.setNextPost()
  router.push({ path: nextPostUrl })
}
const copyUrl = () => {
  copy(url.href)
  alertStore.setAlert('Copied url to clipboard', 'info')
}
const isAdmin = computed<boolean>(() => {
  if (isAuthenticated.value === false) return false
  if (currentUser.value === null) return false
  if (role.value === null) return false
  if (role.value !== 'ADMIN') return false
  return true
})
const isManagerOrUp = computed<boolean>(() => {
  if (isAuthenticated.value === false) return false
  if (currentUser.value === null) return false
  if (role.value === null) return false
  if (role.value !== 'ADMIN' && role.value !== 'MANAGER') return false
  return true
})
const isAuthor = computed<boolean>(() => {
  if (isAuthenticated.value === false) return false
  if (currentUser.value === null) return false
  if (currentUser.value._id !== currentPost.value?.author._id) return false
  return true
})
const saveEdit = async (text: string) => {
  if (typeof route.params.id !== 'string') return
  if (isAuthor.value === false) return
  if (import.meta.client && window.confirm('Please confirm to save changes.')) {
    await postStore.updatePost(route.params.id, {
      content: text,
    })
  }
  postStore.setCurrentPost(route.params.id)
}
const deletePost = async () => {
  if (typeof route.params.id !== 'string') return
  if (isAdmin.value === false && isAuthor.value === false) return
  if (
    import.meta.client &&
    window.confirm('Please confirm to permanently delete this post')
  ) {
    await postStore.deletePostById(route.params.id)
  }
  router.push({ path: '/posts' })
}
const onCommentSubmit = async (text: string) => {
  if (!cookie.value) return
  await $fetch(`/api/comment/${route.params.id}`, {
    method: 'POST',
    headers: { Authorization: cookie.value },
    body: { text },
  })
  alertStore.setAlert('Successfully created a comment!', 'success')
  refresh()
}
const onCommentDelete = async (id: string) => {
  if (isManagerOrUp.value === false && isAuthor.value === false) return
  if (!cookie.value) return
  await $fetch(`/api/comment/${id}`, {
    method: 'DELETE',
    headers: { Authorization: cookie.value },
  })
  alertStore.setAlert('Successfully deleted a comment!', 'success')
  refresh()
}
</script>

<template>
  <section class="py-md min-h-[90dvh]" @click="router.push({ path: '/posts' })">
    <div class="container">
      <div class="px-xs">
        <div
          class="max-w-screen-lg mx-auto bg-light-2 rounded-md relative"
          ref="contentRef"
          @click.stop
        >
          <div
            v-if="currentPost === null"
            class="w-full flex justify-center py-lg"
          >
            <div
              class="aspect-square w-3xl rounded-full border-8 border-r-primary animate-spin"
            ></div>
          </div>
          <div
            v-else
            class="relative grid md:grid-cols-2 gap-6 px-xs pt-[40px] pb-sm md:pb-md"
          >
            <!-- left side -->
            <div>
              <div class="relative">
                <Transition mode="out-in">
                  <NuxtImg
                    v-if="!postLoading"
                    provider="cloudinary"
                    :src="currentPost?.imageId"
                    alt="a picture of manguito"
                    class="relative object-center object-cover w-full rounded-md"
                    :placeholder="[484, 645]"
                    placeholder-class="img-placeholder"
                    width="484"
                    height="645"
                    fit="cover"
                  />
                  <div
                    v-else
                    class="relative aspect-[3/4] w-full bg-light-3 rounded-md flex flex-col justify-center items-center"
                  >
                    <div
                      class="animate-spin rounded-full h-2xl w-2xl border-8 border-light-1 border-r-primary"
                    ></div>
                  </div>
                </Transition>
                <!-- share button -->
                <button
                  v-if="isSupported"
                  class="absolute top-0 right-0 text-light-1 p-3xs mr-2xs mt-2xs hover:text-primary transition-colors duration-300 ease-linear"
                  aria-label="copy current url"
                  @click="copyUrl"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 576 512"
                    fill="currentColor"
                    class="w-sm"
                  >
                    <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
                    <path
                      d="M400 255.4l0-15.4 0-32c0-8.8-7.2-16-16-16l-32 0-16 0-46.5 0c-50.9 0-93.9 33.5-108.3 79.6c-3.3-9.4-5.2-19.8-5.2-31.6c0-61.9 50.1-112 112-112l48 0 16 0 32 0c8.8 0 16-7.2 16-16l0-32 0-15.4L506 160 400 255.4zM336 240l16 0 0 48c0 17.7 14.3 32 32 32l3.7 0c7.9 0 15.5-2.9 21.4-8.2l139-125.1c7.6-6.8 11.9-16.5 11.9-26.7s-4.3-19.9-11.9-26.7L409.9 8.9C403.5 3.2 395.3 0 386.7 0C367.5 0 352 15.5 352 34.7L352 80l-16 0-32 0-16 0c-88.4 0-160 71.6-160 160c0 60.4 34.6 99.1 63.9 120.9c5.9 4.4 11.5 8.1 16.7 11.2c4.4 2.7 8.5 4.9 11.9 6.6c3.4 1.7 6.2 3 8.2 3.9c2.2 1 4.6 1.4 7.1 1.4l2.5 0c9.8 0 17.8-8 17.8-17.8c0-7.8-5.3-14.7-11.6-19.5c0 0 0 0 0 0c-.4-.3-.7-.5-1.1-.8c-1.7-1.1-3.4-2.5-5-4.1c-.8-.8-1.7-1.6-2.5-2.6s-1.6-1.9-2.4-2.9c-1.8-2.5-3.5-5.3-5-8.5c-2.6-6-4.3-13.3-4.3-22.4c0-36.1 29.3-65.5 65.5-65.5l14.5 0 32 0zM72 32C32.2 32 0 64.2 0 104L0 440c0 39.8 32.2 72 72 72l336 0c39.8 0 72-32.2 72-72l0-64c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 64c0 13.3-10.7 24-24 24L72 464c-13.3 0-24-10.7-24-24l0-336c0-13.3 10.7-24 24-24l64 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L72 32z"
                    />
                  </svg>
                </button>
                <button
                  class="absolute left-0 top-1/2 -translate-y-1/2 text-light-1 p-3xs hover:text-primary transition-colors duration-300 ease-linear"
                  aria-label="previous post"
                  @click="handlePrevClick"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 320 512"
                    fill="currentColor"
                    class="w-xs"
                  >
                    <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
                    <path
                      d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"
                    />
                  </svg>
                </button>
                <button
                  class="absolute right-0 top-1/2 -translate-y-1/2 text-light-1 p-3xs hover:text-primary transition-colors duration-300 ease-linear"
                  aria-label="next post"
                  @click="handleNextClick"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 320 512"
                    fill="currentColor"
                    class="w-xs"
                  >
                    <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
                    <path
                      d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <!-- right side -->
            <div class="flex flex-col gap-3">
              <ContentBlock
                v-if="currentPost !== null"
                :is-admin="isAdmin"
                :is-author="isAuthor"
                :post="currentPost"
                @on-delete="deletePost"
                @on-save="saveEdit"
              />
              <CommentInput
                v-if="isAuthenticated"
                @submit-comment="onCommentSubmit"
              />
              <CommentItem
                v-for="(comment, idx) in comments"
                :key="idx"
                :is-manager-or-up="isManagerOrUp"
                :is-author="isAuthor"
                :comment="comment"
                @delete-click="onCommentDelete"
              />
            </div>
          </div>
          <!-- close button -->
          <NuxtLink
            to="/posts"
            class="absolute top-0 right-0 mt-2xs mr-[12px] text-dark-2 hover:opacity-60 transition-opacity duration-300 ease-linear"
            aria-label="close cross"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 384 512"
              fill="currentColor"
              class="w-sm aspect-square"
            >
              <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
              <path
                d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"
              />
            </svg>
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.img-placeholder {
  background-color: #e8e8e8;
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}
.v-enter-from,
v-leave-to {
  opacity: 0;
}
</style>
