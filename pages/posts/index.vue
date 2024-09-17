<script setup lang="ts">
import { useRuntimeConfig } from '#app'
import { usePostStore } from '@/stores'
import { storeToRefs } from 'pinia'

const config = useRuntimeConfig()
const postStore = usePostStore()
const { posts } = storeToRefs(postStore)
const formatPostUrl = (id: string) => {
  return `${config.public.cloudinarySourceUrl}/c_scale,w_480/f_auto/v1700694621/${id}`
}
const resolveLinkPath = (id: string) => {
  return `/posts/${id}`
}
</script>

<template>
  <div class="container">
    <h2 class="h2-md mb-md">Manguito Page</h2>
    <div class="grid grid-cols-3 gap-1 lg:gap-4 px-3xs md:px-xs lg:px-md">
      <div v-for="(post, idx) in posts" :key="idx">
        <NuxtLink :to="resolveLinkPath(post._id as string)">
          <img
            :src="formatPostUrl(post.imageId)"
            alt="image card"
            class="aspect-square w-full object-center object-cover hover:grayscale transition-[filter] duration-300 ease-linear"
          />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
