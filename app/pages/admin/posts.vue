<script setup lang="ts">
import { PopulatedPostModel } from '@/server/models'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-route'],
})

useHead({
  title: 'Admin - Posts | Manguito Page',
  meta: [{ property: 'og:title', content: 'Admin - Posts | Manguito Page' }],
})

const cookie = useAuthToken()

const { data: res, refresh } = await useFetch<PopulatedPostModel[]>('/api/post')

const formattedUrl = (id: string): string => {
  const imageUrl = new ImageUrl(id)
  return imageUrl.getNuxtImageCardUrl()
}
const onDelete = async (id: string) => {
  if (!cookie.value) return
  if (
    import.meta.client &&
    window.confirm('Please confirm to permanently delete this post')
  ) {
    await $fetch(`/api/post/${id}`, {
      method: 'DELETE',
      headers: { Authorization: cookie.value },
    })
  }
  refresh()
}
</script>

<template>
  <div class="font-inter max-w-screen-md mx-auto py-md px-2xs">
    <h2 class="h2-md mb-xs">Posts</h2>
    <div class="grid gap-2">
      <div
        v-for="post in res"
        :key="post._id!.toString()"
        class="bg-light-4 rounded-md overflow-x-hidden drop-shadow-md flex flex-col md:flex-row"
      >
        <NuxtImg
          provider="cloudinary"
          :src="formattedUrl(post.imageId)"
          alt="post image"
          class="aspect-square h-3xl object-center object-cover rounded-t-md md:rounded-tr-none md:rounded-l-md"
          loading="lazy"
        />
        <div
          class="flex flex-col md:flex-row justify-between w-full px-xs py-sm gap-4"
        >
          <div class="w-full">
            <p>
              {{ post.content }}
            </p>
            <div class="text-end text-sm text-dark-1">
              <p>{{ post?.author.name }}</p>
              <ClientOnly>
                <p>{{ new Date(post.date).toDateString() }}</p>
              </ClientOnly>
            </div>
          </div>
          <div class="flex items-center justify-end md:justify-center">
            <!-- delete -->
            <button
              class="hover:opacity-65 duration-300 ease-linear text-dark-1"
              aria-label="delete post"
              @click="onDelete(post._id!.toString())"
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
  </div>
</template>
