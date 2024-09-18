<script setup lang="ts">
import { ImageUrl } from '@/composables/useImageUrl'
import { usePostStore } from '@/stores'
import { onClickOutside } from '@vueuse/core'
import { storeToRefs } from 'pinia'

const route = useRoute()
const router = useRouter()
const postStore = usePostStore()
const { currentPost } = storeToRefs(postStore)
const contentRef = ref<HTMLDivElement>()
onClickOutside(contentRef, () => {
  router.push({ path: '/posts' })
})

postStore.setCurrentPost(route.params.id as string)

const resolveCardImage = (img: string) => {
  const imgUrl = new ImageUrl(img)
  return imgUrl.getPostUrl()
}

const handlePrevClick = () => {
  const prevPostUrl = postStore.setPrevPost()
  router.push({ path: prevPostUrl })
}
const handleNextClick = () => {
  const nextPostUrl = postStore.setNextPost()
  router.push({ path: nextPostUrl })
}
</script>

<template>
  <section class="bg-light-4 py-md">
    <div class="container">
      <div class="px-xs">
        <div
          class="max-w-screen-lg mx-auto bg-light-2 rounded-md relative"
          ref="contentRef"
        >
          <div
            class="relative grid md:grid-cols-2 gap-4 px-xs pt-[40px] pb-sm md:pb-md"
          >
            <div class="relative">
              <img
                :src="resolveCardImage(currentPost?.imageId!)"
                alt="a picture of manguito"
                class="relative object-center object-cover w-full rounded-md"
              />
              <button
                class="absolute left-0 top-1/2 -translate-y-1/2 text-light-1 p-3xs hover:text-primary transition-colors duration-300 ease-linear"
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
            <div>
              <div class="bg-light-4 px-xs py-sm rounded-md">
                {{ currentPost?.content }}
              </div>
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

<style scoped></style>
