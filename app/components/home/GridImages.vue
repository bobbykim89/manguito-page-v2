<script setup lang="ts">
import type { PostType } from '#shared/types'
import { ImageUrl } from '@/composables/useImageUrl'
import FlipCard from '@/components/home/FlipCard.vue'

defineProps<{
  cards: PostType[]
  // the posts are still loading (the spinner shows only then)
  pending: boolean
}>()

const resolveImageUrl = (id: string): string => {
  const imgUrl = new ImageUrl(id)
  return imgUrl.getThumbUrl()
}
const resolveCardColor = (idx: number): 'primary' | 'info' => {
  const pinkCardIdx: number[] = [2, 3, 5]
  return pinkCardIdx.includes(idx) ? 'primary' : 'info'
}
</script>

<template>
  <section class="container grid place-items-center">
    <div v-if="pending" class="mx-auto py-md">
      <div
        class="aspect-square w-3xl animate-spin rounded-full border-8 border-r-primary"
      ></div>
    </div>
    <p v-else-if="cards.length === 0" class="py-md text-center text-dark-2">
      No photos to show right now.
    </p>
    <div
      v-else
      class="font-inter grid max-w-screen-lg grid-cols-2 gap-4 p-xs md:grid-cols-4"
    >
      <h2
        class="h2-md col-span-2 grid grid-cols-2 gap-4 md:col-span-3 md:grid-cols-3"
      >
        <span class="col-span-2 row-start-2">
          Take a look at some pictures!
        </span>
      </h2>
      <div
        class="font-marker col-start-2 row-start-2 animate-bounce-settle self-center text-right transition duration-150 ease-in md:col-span-2 md:col-start-1 md:pr-md"
      >
        <span class="h3-lg mr-xs">Flip me over!!</span>
        <NuxtImg
          src="/img/home/arrow.webp"
          class="mt-xs mr-lg inline-block w-20 rotate-180 md:mr-sm md:rotate-55"
          alt="arrow image"
        />
      </div>
      <FlipCard
        v-for="(card, idx) in cards"
        :key="card._id"
        :image-source="resolveImageUrl(card.imageId)"
        :caption="card.content"
        :to="`/posts/${card._id}`"
        :index="idx + 1"
        :color="resolveCardColor(idx)"
      />
    </div>
  </section>
</template>
