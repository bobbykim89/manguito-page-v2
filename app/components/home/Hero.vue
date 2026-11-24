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
    class="font-inter grid grid-flow-row overflow-x-hidden py-xs md:grid-cols-5 md:py-md"
  >
    <div class="order-2 col-span-2 w-full md:order-1">
      <div
        class="ml-auto flex h-full max-w-screen-sm flex-col items-center justify-center md:items-start md:pl-md"
      >
        <div>
          <p
            class="h3-md mb-2xs ml-2xs text-start font-semibold tracking-wider"
          >
            Welcome to
          </p>
          <h1 class="h1-md mb-sm text-primary" v-html="hadingText"></h1>
        </div>
        <p
          class="mb-md w-5/6 text-center text-md md:w-full md:text-start lg:text-lg"
          v-html="heroParagraph"
        ></p>
        <div class="mx-auto">
          <NuxtLink
            :to="linkUrl"
            class="btn btn-progress animate-bounce drop-shadow-md btn-primary"
          >
            <span>
              {{ linkText }}
            </span>
          </NuxtLink>
        </div>
      </div>
    </div>
    <div class="order1 relative col-span-3 min-h-75 md:order-2">
      <div
        class="absolute top-0 -left-4 h-72 w-72 animate-balls rounded-full bg-[#a2d918] opacity-50 mix-blend-multiply blur-xl filter lg:left-[10%] lg:h-96 lg:w-96"
      />
      <div
        class="animation-delay-2000 absolute top-0 right-[12%] h-72 w-72 animate-balls rounded-full bg-yellow-300 opacity-50 mix-blend-multiply blur-xl filter lg:right-1/4 lg:h-96 lg:w-96"
      />
      <div
        class="animation-delay-4000 absolute -bottom-4 left-8 h-72 w-72 animate-balls rounded-full bg-red-300 opacity-50 mix-blend-multiply blur-xl filter lg:left-1/4 lg:h-96 lg:w-96"
      />
      <NuxtImg
        src="/img/home/manguito_transparent.webp"
        class="relative mx-auto w-4/5 object-contain lg:w-1/2"
        sizes="80vw lg:30vw"
        height="400"
        alt="manguito banner"
        :placeholder="[340, 400]"
      />
    </div>
  </section>
</template>
