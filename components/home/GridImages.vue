<script setup lang="ts">
import { useRuntimeConfig } from '#app'
import ArrowImg from '@/assets/img/home/arrow.png'
import { PopulatedPostModel } from '@/server/models'
import { MclCardC } from '@bobbykim/mcl-cards'

defineProps<{
  cards: PopulatedPostModel[]
}>()

const config = useRuntimeConfig()

const resolveImageUrl = (id: string): string => {
  return `${config.public.cloudinarySourceUrl}/c_scale,w_320/f_auto/v1700694621/${id}`
}
</script>

<template>
  <section class="container grid place-items-center">
    <div v-if="cards.length === 0">loader</div>
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
        class="row-start-2 col-start-2 md:col-start-1 md:col-span-2 self-center md:pr-md text-right font-marker text-xl transition ease-in duration-150 animate-bounce"
      >
        Flip me over!!
        <img
          :src="ArrowImg"
          class="inline-block w-20 rotate-180 md:rotate-[55deg] mr-lg md:mr-sm mt-xs"
          alt="arrow image"
        />
      </div>
      <MclCardC
        :image-source="resolveImageUrl(cards[0].imageId)"
        card-color="success"
      ></MclCardC>
      <MclCardC
        :image-source="resolveImageUrl(cards[1].imageId)"
        card-color="success"
      ></MclCardC>
      <MclCardC
        :image-source="resolveImageUrl(cards[2].imageId)"
        card-color="primary"
      ></MclCardC>
      <MclCardC
        :image-source="resolveImageUrl(cards[3].imageId)"
        card-color="primary"
      ></MclCardC>
      <MclCardC
        :image-source="resolveImageUrl(cards[4].imageId)"
        card-color="success"
      ></MclCardC>
      <MclCardC
        :image-source="resolveImageUrl(cards[5].imageId)"
        card-color="primary"
      ></MclCardC>
      <MclCardC
        :image-source="resolveImageUrl(cards[6].imageId)"
        card-color="success"
      ></MclCardC>
    </div>
  </section>
</template>

<style scoped></style>
