<script setup lang="ts">
import AboutImage from '@/assets/img/about.jpg'
import { useUserStore } from '@/stores'
import { storeToRefs } from 'pinia'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-route'],
})

useHead({
  title: 'Admin | Manguito Page',
  meta: [{ property: 'og:title', content: 'Admin | Manguito Page' }],
})

const userStore = useUserStore()
const { currentUser } = storeToRefs(userStore)
</script>

<template>
  <div class="flex justify-center py-sm font-inter px-2xs">
    <div
      class="max-w-screen-md bg-light-4 rounded-lg px-sm py-md md:px-md md:py-lg"
    >
      <img
        :src="AboutImage"
        alt="inspector pollo"
        class="aspect-square rounded-full border-4 border-dark-1 max-h-[256px] mb-sm"
      />
      <h2 class="h2-md mb-xs text-center">Admin Page</h2>
      <p class="text-lg">Current user info</p>
      <ul class="mcl-list mcl-list-lg mcl-list-primary">
        <li>
          Username:
          {{ currentUser?.name }}
        </li>
        <li>
          Email:
          {{ currentUser?.email }}
        </li>
        <li>
          User role:
          {{ currentUser?.role }}
        </li>
      </ul>
      <p class="text-lg mb-2xs">Navigate to:</p>
      <div
        class="flex gap-1 justify-center items-center bg-light-3 py-2xs px-3xs text-dark-1 overflow-y-auto rounded-lg"
      >
        <NuxtLink
          to="/admin/posts"
          aria-label="posts"
          class="hover:opacity-60 transition-opacity duration-300 ease-linear p-3xs"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            fill="currentColor"
            class="w-md aspect-square"
          >
            <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
            <path
              d="M448 80c8.8 0 16 7.2 16 16l0 319.8-5-6.5-136-176c-4.5-5.9-11.6-9.3-19-9.3s-14.4 3.4-19 9.3L202 340.7l-30.5-42.7C167 291.7 159.8 288 152 288s-15 3.7-19.5 10.1l-80 112L48 416.3l0-.3L48 96c0-8.8 7.2-16 16-16l384 0zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zm80 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"
            />
          </svg>
        </NuxtLink>
        <NuxtLink
          to="/admin/comments"
          aria-label="comments"
          class="hover:opacity-60 transition-opacity duration-300 ease-linear p-3xs"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            fill="currentColor"
            class="w-md aspect-square"
          >
            <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
            <path
              d="M512 240c0 114.9-114.6 208-256 208c-37.1 0-72.3-6.4-104.1-17.9c-11.9 8.7-31.3 20.6-54.3 30.6C73.6 471.1 44.7 480 16 480c-6.5 0-12.3-3.9-14.8-9.9c-2.5-6-1.1-12.8 3.4-17.4c0 0 0 0 0 0s0 0 0 0s0 0 0 0c0 0 0 0 0 0l.3-.3c.3-.3 .7-.7 1.3-1.4c1.1-1.2 2.8-3.1 4.9-5.7c4.1-5 9.6-12.4 15.2-21.6c10-16.6 19.5-38.4 21.4-62.9C17.7 326.8 0 285.1 0 240C0 125.1 114.6 32 256 32s256 93.1 256 208z"
            />
          </svg>
        </NuxtLink>
        <NuxtLink
          to="/admin/users"
          aria-label="users"
          class="hover:opacity-60 transition-opacity duration-300 ease-linear p-3xs"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 576 512"
            fill="currentColor"
            class="w-md aspect-square"
          >
            <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
            <path
              d="M0 96l576 0c0-35.3-28.7-64-64-64L64 32C28.7 32 0 60.7 0 96zm0 32L0 416c0 35.3 28.7 64 64 64l448 0c35.3 0 64-28.7 64-64l0-288L0 128zM64 405.3c0-29.5 23.9-53.3 53.3-53.3l117.3 0c29.5 0 53.3 23.9 53.3 53.3c0 5.9-4.8 10.7-10.7 10.7L74.7 416c-5.9 0-10.7-4.8-10.7-10.7zM176 192a64 64 0 1 1 0 128 64 64 0 1 1 0-128zm176 16c0-8.8 7.2-16 16-16l128 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-128 0c-8.8 0-16-7.2-16-16zm0 64c0-8.8 7.2-16 16-16l128 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-128 0c-8.8 0-16-7.2-16-16zm0 64c0-8.8 7.2-16 16-16l128 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-128 0c-8.8 0-16-7.2-16-16z"
            />
          </svg>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
