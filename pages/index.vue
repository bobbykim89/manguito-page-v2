<script setup lang="ts">
import { useRuntimeConfig } from '#imports'
import Hero from '@/components/home/Hero.vue'
import { usePostStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { reactive } from 'vue'

const config = useRuntimeConfig()
const postStore = usePostStore()
const { posts } = storeToRefs(postStore)
const heroContent = reactive<{
  heading: string
  paragraph: string
  url: string
  linkText: string
}>({
  heading: 'Manguito Page',
  paragraph:
    'Manguito is tiny Peach faced lovebird who likes to chirp and play! Moreover, he is so cute but also very evil.',
  url: '/posts',
  linkText: 'Head to Gallery',
})

const formatPostUrl = (id: string) => {
  return `${config.public.cloudinarySourceUrl}/c_scale,w_480/f_auto/v1700694621/${id}`
}
</script>

<template>
  <main>
    <Hero
      :hading-text="heroContent.heading"
      :hero-paragraph="heroContent.paragraph"
      :link-url="heroContent.url"
      :link-text="heroContent.linkText"
    />
    <div class="container">
      <h2 class="h2-md mb-md">Manguito Page</h2>
      <div class="grid grid-cols-3 gap-4 px-xs md:px-md">
        <div v-for="(post, idx) in posts" :key="idx">
          <img
            :src="formatPostUrl(post.imageId)"
            alt="image card"
            class="aspect-square w-full object-center object-cover hover:grayscale transition-[filter] duration-300 ease-linear"
          />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>
