<script setup lang="ts">
import { PopulatedPostModel } from '@/server/models'
import { onClickOutside } from '@vueuse/core'

const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const contentRef = ref<HTMLDivElement>()
onClickOutside(contentRef, () => router.push({ path: '/posts' }))
const { data: res } = await useFetch<PopulatedPostModel>(
  `/api/post/${route.params.id}`,
  {
    method: 'GET',
  }
)

const resolveCardImage = (img: string) => {
  return `${config.public.cloudinarySourceUrl}/c_scale,w_1200/q_auto/v1700694621/${img}`
}
</script>

<template>
  <section class="bg-light-4 py-md">
    <div class="container">
      <div class="px-xs">
        <div
          class="max-w-screen-lg px-2xs md:px-sm py-xs md:py-md mx-auto bg-light-2 rounded-md"
          ref="contentRef"
        >
          <div class="grid grid-cols-2 gap-4">
            <img
              :src="resolveCardImage(res?.imageId!)"
              alt="a picture of manguito"
              class="object-center object-cover w-full h-full rounded-md"
            />
            <div class="bg-light-4 px-2xs py-xs rounded-md">
              {{ res?.content }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
