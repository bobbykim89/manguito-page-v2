<script setup lang="ts">
import { UserModel } from '@/server/models'
const props = defineProps<{
  loginUrl: string
  signupUrl: string
  auth: boolean
  user?: UserModel | null
}>()

const emit = defineEmits<{
  (e: 'logout-click', event: Event): void
  (e: 'link-click', event: Event): void
}>()
const handleLogoutClick = (e: Event) => {
  e.preventDefault
  emit('logout-click', e)
}
const handleButtonClick = (e: Event) => {
  emit('link-click', e)
}
</script>

<template>
  <div class="bg-dark-1 py-2xs px-2xs lg:bg-transparent lg:py-0 lg:px-0">
    <!-- auth btns -->
    <div
      v-if="auth"
      class="flex flex-wrap justify-center lg:justify-normal items-center gap-4 md:border-l-2 border-dark-3 px-sm"
    >
      <button
        class="flex items-center gap-1 font-bold hover:opacity-60 transition-opacity duration-300 ease-linear"
      >
        <span class="text-sm lg:text-md">
          {{ user?.name }}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 576 512"
          class="h-[12px] lg:h-xs aspect-square text-warning"
          fill="currentColor"
        >
          <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
          <path
            d="M309 106c11.4-7 19-19.7 19-34c0-22.1-17.9-40-40-40s-40 17.9-40 40c0 14.4 7.6 27 19 34L209.7 220.6c-9.1 18.2-32.7 23.4-48.6 10.7L72 160c5-6.7 8-15 8-24c0-22.1-17.9-40-40-40S0 113.9 0 136s17.9 40 40 40c.2 0 .5 0 .7 0L86.4 427.4c5.5 30.4 32 52.6 63 52.6l277.2 0c30.9 0 57.4-22.1 63-52.6L535.3 176c.2 0 .5 0 .7 0c22.1 0 40-17.9 40-40s-17.9-40-40-40s-40 17.9-40 40c0 9 3 17.3 8 24l-89.1 71.3c-15.9 12.7-39.5 7.5-48.6-10.7L309 106z"
          />
        </svg>
      </button>
      <!-- logout button -->
      <button
        class="relative flex items-center gap-1 font-bold before:absolute before:h-3xs before:bg-primary before:w-0 hover:before:w-full before:bottom-0 before:transition-[width] before:duration-300 before:ease-linear"
        @click="handleLogoutClick"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          fill="currentColor"
          class="h-[12px] lg:h-xs aspect-square relative"
        >
          <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
          <path
            d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"
          />
        </svg>
        <span class="text-sm lg:text-md relative">Logout</span>
      </button>
    </div>
    <!-- guest btns -->
    <div
      v-else
      class="flex justify-center md:justify-normal items-center gap-xs md:gap-sm md:border-l-2 border-dark-3 px-sm text-light-4 lg:text-dark-3 md:text-dark-3"
    >
      <!-- login btn -->
      <NuxtLink
        :to="loginUrl"
        class="flex items-center gap-1 lg:gap-3 font-bold relative before:absolute before:h-3xs before:bg-primary before:w-0 hover:before:w-full before:bottom-0 before:transition-[width] before:duration-300 before:ease-linear"
        @click="handleButtonClick"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          class="h-[12px] lg:h-xs aspect-square relative"
          fill="currentColor"
        >
          <!-- !Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
          <path
            d="M217.9 105.9L340.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L217.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1L32 320c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM352 416l64 0c17.7 0 32-14.3 32-32l0-256c0-17.7-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0c53 0 96 43 96 96l0 256c0 53-43 96-96 96l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32z"
          />
        </svg>
        <span class="text-sm lg:text-md relative">Login</span>
      </NuxtLink>
      <!-- signup btn -->
      <NuxtLink
        :to="signupUrl"
        class="flex items-center gap-1 lg:gap-3 font-bold relative before:absolute before:h-3xs before:bg-primary before:w-0 hover:before:w-full before:bottom-0 before:transition-[width] before:duration-300 before:ease-linear"
        @click="handleButtonClick"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 512"
          class="h-xs aspect-square relative"
          fill="currentColor"
        >
          <!-- !Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
          <path
            d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304h91.4C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7H29.7C13.3 512 0 498.7 0 482.3zM504 312V248H440c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V136c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H552v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"
          />
        </svg>
        <span class="text-sm lg:text-md relative">Signup</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped></style>
