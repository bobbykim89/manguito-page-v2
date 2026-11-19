<script setup lang="ts">
import { useRequestURL } from '#app'

const url = useRequestURL()

useHead({
  title: '404 | Manguito Page',
  meta: [
    { property: 'og:title', content: '404 | Manguito Page' },
    { property: 'twitter:domain', content: url.host },
    {
      name: 'twitter:title',
      content: '404 | Manguito Page',
    },
  ],
})
</script>

<template>
  <NuxtLayout name="default">
    <section class="flex min-h-[75vh] items-center">
      <div
        class="mx-auto rounded-md bg-light-3 px-xl py-md text-center text-dark-3 drop-shadow-md"
      >
        <h1 class="mb-sm text-[4rem] font-bold">404</h1>
        <p class="mb-xs text-[1.5rem]">This page doesn't exist</p>
        <NuxtLink to="/" class="btn text-light-3 btn-primary"
          >Back to main page</NuxtLink
        >
      </div>
    </section>
  </NuxtLayout>
</template>
