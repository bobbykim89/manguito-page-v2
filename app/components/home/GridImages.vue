<script setup lang="ts">
import type { PostType } from '#shared/types'
import { ImageUrl } from '@/composables/useImageUrl'
import { type ColorPalette } from '@bobbykim/manguito-theme'
import { MclCardC } from '@bobbykim/mcl-cards'

defineProps<{
  cards: PostType[]
}>()

const resolveImageUrl = (id: string): string => {
  const imgUrl = new ImageUrl(id)
  return imgUrl.getThumbUrl()
}
const resolveCardColor = (idx: number): ColorPalette => {
  const pinkCardIdx: number[] = [2, 3, 5]
  return pinkCardIdx.includes(idx) ? 'primary' : 'info'
}
</script>

<template>
  <section class="container grid place-items-center">
    <div v-if="cards.length === 0" class="mx-auto py-md">
      <div
        class="aspect-square w-3xl animate-spin rounded-full border-8 border-r-primary"
      ></div>
    </div>
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
        class="font-marker col-start-2 row-start-2 animate-bounce self-center text-right transition duration-150 ease-in md:col-span-2 md:col-start-1 md:pr-md"
      >
        <span class="h3-lg mr-xs">Flip me over!!</span>
        <NuxtImg
          src="/img/home/arrow.webp"
          class="mt-xs mr-lg inline-block w-20 rotate-180 md:mr-sm md:rotate-55"
          alt="arrow image"
        />
      </div>
      <MclCardC
        v-for="(card, idx) in cards"
        :key="idx"
        :image-source="resolveImageUrl(card.imageId)"
        :image-alt="`grid image ${idx}`"
        :card-color="resolveCardColor(idx)"
        @card-click="$router.push({ path: `/posts/${card._id}` })"
      ></MclCardC>
    </div>
  </section>
</template>
