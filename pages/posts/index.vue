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
  <div class="container font-inter">
    <div class="max-w-screen-lg mx-auto py-md">
      <h2 class="h2-md font-light mb-md text-center">Enjoy the gallery!</h2>
      <div class="grid grid-cols-3 gap-1 lg:gap-2 px-3xs md:px-xs lg:px-md">
        <!-- cards -->
        <div v-for="(post, idx) in posts" :key="idx">
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
      </div>
    </div>
  </div>
</template>

<style scoped></style>
