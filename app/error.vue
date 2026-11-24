<script setup lang="ts">
import type { NuxtError } from '#app'
import { useRequestURL } from '#app'

const props = defineProps<{ error: NuxtError }>()

const url = useRequestURL()

const status = computed<number>(() => props.error?.statusCode || 500)
const message = computed<string>(() => {
  if (status.value === 404) return "This page doesn't exist"
  // never echo server internals for server errors
  if (status.value >= 500) return 'Something went wrong, please try again'
  return props.error?.statusMessage || props.error?.message || 'Request failed'
})
const pageTitle = computed<string>(() => `${status.value} | Manguito Page`)

useHead({
  title: pageTitle,
  meta: [
    { property: 'og:title', content: pageTitle },
    { property: 'twitter:domain', content: url.host },
    {
      name: 'twitter:title',
      content: pageTitle,
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
        <h1 class="mb-sm text-[4rem] font-bold">{{ status }}</h1>
        <p class="mb-xs text-[1.5rem]">{{ message }}</p>
        <NuxtLink to="/" class="btn text-light-1 btn-primary"
          >Back to main page</NuxtLink
        >
      </div>
    </section>
  </NuxtLayout>
</template>
