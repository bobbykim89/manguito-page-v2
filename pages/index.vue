<script setup lang="ts">
import { useRequestURL } from '#app'
import Hero from '@/components/home/Hero.vue'
import { usePostStore } from '@/stores'
import { MclContainerA } from '@bobbykim/mcl-container'
import { defineAsyncComponent, reactive } from 'vue'

const url = useRequestURL()

useHead({
  meta: [
    { property: 'og:url', content: url.href },
    { property: 'twitter:domain', content: url.host },
    { property: 'twitter:url', content: url.href },
  ],
})

const postStore = usePostStore()
const heroContent = reactive<{
  heading: string
  paragraph: string
  url: string
  linkText: string
}>({
  heading: 'Manguito Page',
  paragraph:
    "Manguito is a tiny Peach-faced lovebird who loves to chirp, play, and get petting. He’s incredibly cuddly and adores millet. While he's undeniably cute, don't be fooled—he can be a little mischievous too!",
  url: '/posts',
  linkText: 'Head to Gallery',
})
const containerContent = reactive<{
  title: string
  desc: string
  img1: string
  img2: string
  img3: string
  img4: string
}>({
  title: "Manguito's Story",
  desc: "We found Manguito in late May. He was barely a baby bird, looking really fragile, cant even chew banana. Honestly I didn't think he will make it over night. Luckily he survived the night and he got more active. These days he is almost grown up bird, chirping and flying around the house, glued to my wife mostly and bothering her doing her work and stealing our food!!",
  img1: '/img/home/manguito-grid-1.webp',
  img2: '/img/home/manguito-grid-2.webp',
  img3: '/img/home/manguito-grid-3.webp',
  img4: '/img/home/manguito-grid-4.webp',
})

const AsyncGrid = defineAsyncComponent({
  loader: () => import('@/components/home/GridImages.vue'),
})
const thankYouComponentContent = reactive<{
  imgSrc: string
  imgAlt: string
  title: string
  desc: string
}>({
  imgSrc: '/img/home/manguito-flowers.webp',
  imgAlt: 'Manguito is perching among flowers',
  title: 'Do you like lovebirds?',
  desc: "Lovebirds are small, vibrant parrots known for their bright feathers and affectionate personalities. Native to Africa, these charming birds are famous for forming strong bonds with their companions, often seen cuddling closely together. Whether you're captivated by their playful nature or the deep connection they share, lovebirds bring joy and companionship to any home. Their lively energy and colorful presence make them a favorite among bird lovers everywhere.",
})
const AsyncParallax = defineAsyncComponent({
  loader: () =>
    import('@bobbykim/mcl-container').then((module) => module.MclContainerB),
})
</script>

<template>
  <main>
    <Hero
      :hading-text="heroContent.heading"
      :hero-paragraph="heroContent.paragraph"
      :link-url="heroContent.url"
      :link-text="heroContent.linkText"
    />
    <MclContainerA>
      <template #left-column>
        <div class="grid grid-cols-2 gap-y-4 py-lg relative">
          <div
            class="absolute w-[280px] md:w-[320px] bg-warning rounded-full aspect-square top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg"
          ></div>
          <div
            class="aspect-square -translate-y-1/4 justify-self-end drop-shadow-lg overflow-hidden rounded-full border-4"
          >
            <NuxtImg
              :src="containerContent.img1"
              alt="picture of manguito looking cheeky"
              class="relative h-[196px] object-center object-cover aspect-square hover:grayscale transition-[filter] duration-300 ease-linear"
              height="196"
              width="196"
              loading="lazy"
            />
          </div>
          <div
            class="aspect-square translate-y-1/4 justify-self-start overflow-hidden border-4 rounded-full drop-shadow-lg"
          >
            <NuxtImg
              :src="containerContent.img2"
              alt="a picture of manguito perching on the branch"
              class="relative h-[196px] object-center object-cover aspect-square hover:grayscale transition-[filter] duration-300 ease-linear"
              height="196"
              width="196"
              loading="lazy"
            />
          </div>
          <div
            class="aspect-square -translate-y-1/4 justify-self-end overflow-hidden border-4 rounded-full drop-shadow-lg"
          >
            <NuxtImg
              :src="containerContent.img3"
              alt="a picture of manguito hiding in flowers"
              class="relative h-[196px] object-center object-cover aspect-square hover:grayscale transition-[filter] duration-300 ease-linear"
              height="196"
              width="196"
              loading="lazy"
            />
          </div>
          <div
            class="aspect-square translate-y-1/4 justify-self-start overflow-hidden border-4 rounded-full drop-shadow-lg"
          >
            <NuxtImg
              :src="containerContent.img4"
              alt="a picture of manguito perching on the fridge magnet"
              class="relative h-[196px] object-center object-cover aspect-square hover:grayscale transition-[filter] duration-300 ease-linear"
              height="196"
              width="196"
              loading="lazy"
            />
          </div>
        </div>
      </template>
      <template #right-column>
        <div
          className="relative text-white font-inter w-full lg:pt-8 px-4 md:w-4/5 md:mx-auto pt-xs md:pt-0 text-center md:text-start flex flex-col justify-center items-center h-full"
        >
          <div className="mb-8">
            <h2 className="h2-md mb-xs" v-html="containerContent.title"></h2>
            <div
              class="h-3xs md:h-2xs w-xl bg-warning mb-xs mx-auto md:mx-0"
            ></div>
            <p className="md:text-lg" v-html="containerContent.desc"></p>
          </div>
        </div>
      </template>
    </MclContainerA>
    <AsyncGrid :cards="postStore.getRecentPosts" />
    <AsyncParallax
      :image-source="thankYouComponentContent.imgSrc"
      :image-alt="thankYouComponentContent.imgAlt"
      :title="thankYouComponentContent.title"
    >
      <template #content>
        <div>
          <div class="md:text-lg" v-html="thankYouComponentContent.desc"></div>
        </div>
      </template>
    </AsyncParallax>
  </main>
</template>
