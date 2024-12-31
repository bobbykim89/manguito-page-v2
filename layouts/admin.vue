<script setup lang="ts">
import AuthBlock from '@/components/layout-components/AuthBlock.vue'
import ScrollToTop from '@/components/layout-components/ScrollToTop.vue'
import UpdateUserInfo from '@/components/layout-components/UpdateUserInfo.vue'
import { useAlertStore, useUserStore } from '@/stores'
import { Alert, HeaderHorizontal, Sidebar } from '@bobbykim/manguito-theme'
import {
  MclFooterA,
  type MenuItemType,
  type SocialUrl,
} from '@bobbykim/mcl-footer'
import { useWindowScroll } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { reactive, ref } from 'vue'

const router = useRouter()
const alertStore = useAlertStore()
const userStore = useUserStore()
const { alertMessage, alertColor } = storeToRefs(alertStore)
const { currentUser, isAuthenticated, role } = storeToRefs(userStore)
const headerRef = ref()
const sidebarRef = ref<InstanceType<typeof Sidebar>>()
const { y } = useWindowScroll({ behavior: 'smooth' })

const footerMenuItems: MenuItemType[] = [
  {
    title: 'Home',
    url: '/',
    target: '_self',
  },
  {
    title: 'Posts',
    url: '/posts',
    target: '_self',
  },
  {
    title: 'About',
    url: '/about',
    target: '_self',
  },
]
const menuItemData = reactive<{
  title: string
  logo: string
  logoAlt: string
  logoLink: string
  socialUrl: SocialUrl
  menu: MenuItemType[]
}>({
  title: 'MANGU<span class="text-primary">IT</span>O',
  logo: '/img/logo192.webp',
  logoAlt: 'Manguito Page layout',
  logoLink: '/',
  menu: footerMenuItems,
  socialUrl: {
    github: 'https://github.com/bobbykim89',
    linkedin: 'https://www.linkedin.com/in/sihun-kim-9baa17165/',
  },
})

const handleTitleClick = (e: Event, link: string) => {
  e.preventDefault()
  router.push({ path: link })
}
const handleFooterMenuClick = (e: Event, item: MenuItemType) => {
  e.preventDefault()
  router.push({ path: item.url })
}
const onUserLogout = () => {
  userStore.logoutUser()
  router.push({ path: '/' })
}
const handleUserBlockClick = () => {
  sidebarRef.value?.open()
}
const onScrollToTop = () => {
  y.value = 0
}
const onUsernameUpdateSubmit = async (e: Event, name: string) => {
  e.preventDefault()
  if (import.meta.client && window.confirm('Please confirm username update')) {
    await userStore.updateUsername({ username: name })
  }
  sidebarRef.value?.close()
}
const onPwUpdateSubmit = async (e: Event, currentPw: string, newPw: string) => {
  e.preventDefault()
  if (import.meta.client && window.confirm('Please confirm password update.')) {
    await userStore.updatePassword({
      currentPassword: currentPw,
      newPassword: newPw,
    })
  }
  sidebarRef.value?.close()
}
</script>

<template>
  <div :class="['bg-light-1', 'relative', 'h-full']">
    <HeaderHorizontal
      ref="headerRef"
      bg-color="light-1"
      mobile-menu-bg-color="light-4"
      :scroll-distance="100"
      data-allow-mismatch
    >
      <template #content>
        <div class="flex flex-shrink-0 items-center self-center md:py-3xs">
          <div class="h-md md:h-lg mr-2xs md:mr-xs align-middle">
            <NuxtLink :to="menuItemData.logoLink">
              <NuxtImg
                :src="menuItemData.logo"
                :alt="menuItemData.logoAlt"
                class="h-full w-full inline-block"
                width="32"
                height="32"
              />
            </NuxtLink>
          </div>
          <div class="flex flex-col justify-center ml-2">
            <NuxtLink :to="menuItemData.logoLink">
              <h2
                class="inline-block align-middle tracking-wider h2-md"
                v-html="menuItemData.title"
              ></h2>
            </NuxtLink>
            <div
              class="hidden lg:flex items-center gap-4 tracking-wider font-semibold text-lg"
            >
              <NuxtLink
                v-for="(link, idx) in menuItemData.menu"
                :key="idx"
                :to="link.url"
                class="relative before:absolute before:h-3xs before:w-0 before:bottom-0 before:bg-primary hover:before:w-full before:transition-[width] before:duration-300 before:ease-linear"
                ><span class="relative">{{ link.title }}</span></NuxtLink
              >
            </div>
          </div>
        </div>
      </template>
      <template #content-right>
        <div>
          <AuthBlock
            login-url="/auth/login"
            signup-url="/auth/signup"
            :auth="isAuthenticated"
            :user="currentUser"
            @logout-click="onUserLogout"
            @user-click="handleUserBlockClick"
          />
        </div>
      </template>
      <template #mobile-content="{ headerClose }">
        <div
          class="flex justify-center items-center gap-4 tracking-wider font-semibold text-lg py-xs"
        >
          <NuxtLink
            v-for="(link, idx) in menuItemData.menu"
            :key="idx"
            :to="link.url"
            @click="headerClose"
            class="relative before:absolute before:h-3xs before:w-0 before:bottom-0 before:bg-primary hover:before:w-full before:transition-[width] before:duration-300 before:ease-linear"
            ><span class="relative">{{ link.title }}</span></NuxtLink
          >
        </div>
        <AuthBlock
          login-url="/auth/login"
          signup-url="/auth/signup"
          :auth="isAuthenticated"
          :user="currentUser"
          @link-click="headerClose"
          @logout-click="onUserLogout(), headerClose()"
          @user-click="handleUserBlockClick(), headerClose()"
        />
      </template>
    </HeaderHorizontal>
    <div class="h-full w-full flex relative">
      <!-- admin page side menu -->
      <div>
        <div
          class="flex flex-col gap-1 items-center bg-dark-3 py-2xs px-3xs text-light-1 h-full overflow-y-auto"
        >
          <NuxtLink
            to="/admin"
            aria-label="home"
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
                d="M575.8 255.5c0 18-15 32.1-32 32.1l-32 0 .7 160.2c0 2.7-.2 5.4-.5 8.1l0 16.2c0 22.1-17.9 40-40 40l-16 0c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1L416 512l-24 0c-22.1 0-40-17.9-40-40l0-24 0-64c0-17.7-14.3-32-32-32l-64 0c-17.7 0-32 14.3-32 32l0 64 0 24c0 22.1-17.9 40-40 40l-24 0-31.9 0c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2l-16 0c-22.1 0-40-17.9-40-40l0-112c0-.9 0-1.9 .1-2.8l0-69.7-32 0c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"
              />
            </svg>
          </NuxtLink>
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
      <div class="w-full">
        <div class="container">
          <Alert
            :show="alertMessage !== null"
            :color="alertColor"
            dismissible
            class="my-xs mx-xs"
          >
            <div class="flex justify-center text-light-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                fill="currentColor"
                class="w-xs mr-2xs"
              >
                <!--! Font Awesome Pro 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. -->
                <path
                  d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-144c-17.7 0-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32z"
                />
              </svg>
              <span>{{ alertMessage }}</span>
            </div>
          </Alert>
          <slot />
        </div>
      </div>
    </div>
    <MclFooterA
      :logo="menuItemData.logo"
      :logo-alt="menuItemData.logoAlt"
      :logo-link="menuItemData.logoLink"
      :logo-as-link="false"
      :title="menuItemData.title"
      title-color="light-1"
      :menu-items="menuItemData.menu"
      :menu-item-as-link="false"
      :social-links="menuItemData.socialUrl"
      border-top-color="primary"
      menu-text-color="light-1"
      social-icon-color="light-1"
      @logo-click="handleTitleClick"
      @menu-click="handleFooterMenuClick"
    >
      <ClientOnly>
        <small class="text-light-1"
          >&copy; Manguito Page {{ new Date().getFullYear() }}</small
        >
      </ClientOnly>
    </MclFooterA>
    <Sidebar
      v-if="currentUser !== null"
      ref="sidebarRef"
      :title="currentUser?.name"
      placement="right"
    >
      <template #body>
        <div class="px-2xs pt-xs">
          <UpdateUserInfo
            @on-username-update="onUsernameUpdateSubmit"
            @on-pw-update="onPwUpdateSubmit"
          />
          <div
            v-if="role === 'ADMIN'"
            class="px-2xs py-xs rounded-md bg-light-4 drop-shadow-md mt-xs"
          >
            <NuxtLink
              to="/admin"
              class="flex gap-2 items-center justify-center px-2xs py-3xs bg-light-2 drop-shadow-md rounded-md hover:opacity-60 duration-300 ease-linear"
            >
              <p>Admin Page</p>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 448 512"
                fill="currentColor"
                class="w-xs aspect-square"
              >
                <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
                <path
                  d="M144 144l0 48 160 0 0-48c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192l0-48C80 64.5 144.5 0 224 0s144 64.5 144 144l0 48 16 0c35.3 0 64 28.7 64 64l0 192c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 256c0-35.3 28.7-64 64-64l16 0z"
                />
              </svg>
            </NuxtLink>
          </div>
        </div>
      </template>
    </Sidebar>
    <ScrollToTop @scroll-click="onScrollToTop" />
  </div>
</template>
