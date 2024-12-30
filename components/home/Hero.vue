<script setup lang="ts">
defineProps<{
  hadingText: string
  heroParagraph: string
  linkUrl: string
  linkText: string
}>()
</script>

<template>
  <section
    class="grid grid-flow-row md:grid-cols-5 py-xs md:py-md font-inter overflow-x-hidden"
  >
    <div class="col-span-2 order-2 md:order-1 w-full">
      <div
        class="h-full flex flex-col items-center md:items-start justify-center md:pl-md max-w-screen-sm ml-auto"
      >
        <div>
          <h3
            class="h3-md font-semibold tracking-wider text-start ml-2xs mb-2xs"
          >
            Welcome to
          </h3>
          <h1 class="h1-md mb-sm text-primary" v-html="hadingText"></h1>
        </div>
        <p
          class="w-5/6 md:w-full text-center md:text-start text-md lg:text-lg mb-md"
          v-html="heroParagraph"
        ></p>
        <div class="mx-auto">
          <NuxtLink
            :to="linkUrl"
            class="btn btn-progress btn-primary animate-bounce"
          >
            <span>
              {{ linkText }}
            </span>
          </NuxtLink>
        </div>
      </div>
    </div>
    <div class="col-span-3 order1 relative md:order-2">
      <div
        class="absolute top-0 -left-4 lg:left-[10%] w-72 h-72 lg:w-96 lg:h-96 bg-[#a2d918] rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-balls"
      />
      <div
        class="absolute top-0 right-[12%] lg:right-1/4 w-72 h-72 lg:w-96 lg:h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-balls animation-delay-2000"
      />
      <div
        class="absolute left-8 lg:left-1/4 -bottom-4 w-72 h-72 lg:w-96 lg:h-96 bg-red-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-balls animation-delay-4000"
      />
      <NuxtImg
        src="/img/home/banner.webp"
        class="relative w-4/5 lg:w-1/2 mx-auto object-contain"
        sizes="80vw lg:30vw"
        alt="manguito banner"
      />
    </div>
  </section>
</template>
