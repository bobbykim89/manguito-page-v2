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
import { computed, reactive, ref } from 'vue'

const route = useRoute()
const router = useRouter()
const alertStore = useAlertStore()
const userStore = useUserStore()
const { alertMessage, alertColor } = storeToRefs(alertStore)
const { currentUser, isAuthenticated, role } = storeToRefs(userStore)
const headerRef = ref()
// the server's instant; NuxtTime keeps it through hydration
const now = new Date()
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
  logoMobile: string
  logo: string
  logoAlt: string
  logoLink: string
  socialUrl: SocialUrl
  menu: MenuItemType[]
}>({
  title: 'MANGU<span class="text-primary">IT</span>O',
  logoMobile: '/img/logo64.webp',
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
const handleUserBlockClick = () => {
  sidebarRef.value?.open()
}
const onScrollToTop = () => {
  y.value = 0
}
const {
  submitUsername: onUsernameUpdateSubmit,
  submitPassword: onPwUpdateSubmit,
} = useAccountSettings(() => sidebarRef.value?.close())
const getLayoutBgColor = computed(() => {
  const path = route.path
  if (path !== '/' && path !== '/posts' && path !== '/about') {
    return 'bg-light-4'
  }
  return 'bg-light-1'
})
</script>

<template>
  <div :class="[getLayoutBgColor, 'relative']">
    <HeaderHorizontal
      ref="headerRef"
      bg-color="light-1"
      mobile-menu-bg-color="light-4"
      :scroll-distance="100"
      data-allow-mismatch
    >
      <template #content>
        <div class="flex flex-shrink-0 items-center self-center md:py-3xs">
          <div class="mr-2xs h-md align-middle md:mr-xs md:h-xl">
            <NuxtLink :to="menuItemData.logoLink">
              <NuxtImg
                :src="menuItemData.logoMobile"
                :alt="menuItemData.logoAlt"
                class="inline-block h-full w-full md:hidden"
                width="32"
                height="32"
              />
              <NuxtImg
                :src="menuItemData.logo"
                :alt="menuItemData.logoAlt"
                class="hidden h-full w-full md:inline-block"
                width="192"
                height="192"
              />
            </NuxtLink>
          </div>
          <div class="ml-2 flex flex-col justify-center">
            <NuxtLink :to="menuItemData.logoLink">
              <h2
                class="h2-md inline-block align-middle tracking-wider"
                v-html="menuItemData.title"
              ></h2>
            </NuxtLink>
            <div
              class="hidden items-center gap-4 text-lg font-semibold tracking-wider lg:flex"
            >
              <NuxtLink
                v-for="(link, idx) in menuItemData.menu"
                :key="idx"
                :to="link.url"
                class="relative before:absolute before:bottom-0 before:h-3xs before:w-0 before:bg-primary before:transition-[width] before:duration-300 before:ease-linear hover:before:w-full"
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
            @logout-click="userStore.logoutUser"
            @user-click="handleUserBlockClick"
          />
        </div>
      </template>
      <template #mobile-content="{ headerClose }">
        <div
          class="flex items-center justify-center gap-4 py-xs text-lg font-semibold tracking-wider"
        >
          <NuxtLink
            v-for="(link, idx) in menuItemData.menu"
            :key="idx"
            :to="link.url"
            @click="headerClose"
            class="relative before:absolute before:bottom-0 before:h-3xs before:w-0 before:bg-primary before:transition-[width] before:duration-300 before:ease-linear hover:before:w-full"
            ><span class="relative">{{ link.title }}</span></NuxtLink
          >
        </div>
        <AuthBlock
          login-url="/auth/login"
          signup-url="/auth/signup"
          :auth="isAuthenticated"
          :user="currentUser"
          @link-click="headerClose"
          @logout-click="(userStore.logoutUser(), headerClose())"
          @user-click="(handleUserBlockClick(), headerClose())"
        />
      </template>
    </HeaderHorizontal>
    <div class="container">
      <Alert
        :show="alertMessage !== null"
        :color="alertColor"
        dismissible
        class="mx-xs my-xs"
      >
        <div class="flex justify-center text-light-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            fill="currentColor"
            class="mr-2xs w-xs"
          >
            <!--! Font Awesome Pro 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. -->
            <path
              d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-144c-17.7 0-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32z"
            />
          </svg>
          <span>{{ alertMessage }}</span>
        </div>
      </Alert>
    </div>
    <div>
      <slot />
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
      <small class="text-light-1"
        >&copy; Manguito Page
        <NuxtTime :datetime="now" year="numeric" locale="en-US"
      /></small>
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
            class="mt-xs rounded-md bg-light-4 px-2xs py-xs drop-shadow-md"
          >
            <NuxtLink
              to="/admin"
              class="flex items-center justify-center gap-2 rounded-md bg-light-2 px-2xs py-3xs drop-shadow-md duration-300 ease-linear hover:opacity-60"
            >
              <p>Admin Page</p>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 448 512"
                fill="currentColor"
                class="aspect-square w-xs"
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
