<script setup lang="ts">
import type { CommentType } from '#shared/types'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-route'],
})

useHead({
  title: 'Admin - Comments | Manguito Page',
  meta: [{ property: 'og:title', content: 'Admin - Comments | Manguito Page' }],
})

const cookie = useAuthToken()
const { data: res, refresh } = await useFetch<CommentType[]>('/api/comment')

const onDelete = async (id: string) => {
  if (!cookie.value) return
  await $fetch(`/api/comment/${id}`, {
    method: 'DELETE',
    headers: { Authorization: cookie.value },
  })
  refresh()
}
</script>

<template>
  <div class="font-inter max-w-screen-md mx-auto py-md px-2xs">
    <h2 class="h2-md mb-xs">Comments</h2>
    <div class="grid gap-2">
      <div
        v-for="comment in res"
        :key="comment._id!.toString()"
        class="bg-light-4 px-xs py-sm rounded-md overflow-x-hidden drop-shadow-md flex flex-col md:flex-row gap-4"
      >
        <div class="w-full">
          <p>
            {{ comment.text }}
          </p>
          <div class="text-end text-sm text-dark-1">
            <p>{{ comment?.author.name }}</p>
            <ClientOnly>
              <p>{{ new Date(comment.date).toDateString() }}</p>
            </ClientOnly>
          </div>
        </div>
        <div class="flex items-center justify-end md:justify-center">
          <!-- delete -->
          <button
            class="hover:opacity-65 duration-300 ease-linear text-dark-1"
            aria-label="delete post"
            @click="onDelete(comment._id!.toString())"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 448 512"
              fill="currentColor"
              class="w-[20px] aspect-square"
            >
              <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
              <path
                d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
