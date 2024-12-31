<script setup lang="ts">
import { ImageUrl } from '@/composables/useImageUrl'
import { PopulatedPostModel } from '@/server/models'
import { type ColorPalette } from '@bobbykim/manguito-theme'
import { MclCardC } from '@bobbykim/mcl-cards'

defineProps<{
  cards: PopulatedPostModel[]
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
        class="aspect-square w-3xl rounded-full border-8 border-r-primary animate-spin"
      ></div>
    </div>
    <div
      v-else
      class="p-xs max-w-screen-lg grid gap-4 grid-cols-2 md:grid-cols-4 font-inter"
    >
      <h2
        class="h2-md col-span-2 md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4"
      >
        <span class="row-start-2 col-span-2">
          Take a look at some pictures!
        </span>
      </h2>
      <div
        class="row-start-2 col-start-2 md:col-start-1 md:col-span-2 self-center md:pr-md text-right font-marker transition ease-in duration-150 animate-bounce"
      >
        <span class="h3-lg mr-xs">Flip me over!!</span>
        <NuxtImg
          src="/img/home/arrow.webp"
          class="inline-block w-20 rotate-180 md:rotate-[55deg] mr-lg md:mr-sm mt-xs"
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
