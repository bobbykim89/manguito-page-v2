<script setup lang="ts">
import MclLogo from '@/assets/img/logo192.png'
import AuthBlock from '@/components/layout-components/AuthBlock.vue'
import { useAlertStore, useUserStore } from '@/stores'
import { Alert, HeaderHorizontal } from '@bobbykim/manguito-theme'
import {
  MclFooterA,
  type MenuItemType,
  type SocialUrl,
} from '@bobbykim/mcl-footer'
import { storeToRefs } from 'pinia'
import { reactive, ref } from 'vue'

const router = useRouter()
const alertStore = useAlertStore()
const userStore = useUserStore()
const { alertMessage, alertColor } = storeToRefs(alertStore)
const { currentUser, isAuthenticated } = storeToRefs(userStore)
const headerRef = ref()

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
  logo: MclLogo,
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
</script>

<template>
  <div class="relative">
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
              <img
                :src="menuItemData.logo"
                :alt="menuItemData.logoAlt"
                class="h-full inline-block"
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
            @logout-click="userStore.logoutUser"
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
          @logout-click="userStore.logoutUser(), headerClose()"
        />
      </template>
    </HeaderHorizontal>
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
      <ClientOnly>
        <small class="text-light-1"
          >&copy; Manguito Page {{ new Date().getFullYear() }}</small
        >
      </ClientOnly>
    </MclFooterA>
  </div>
</template>

<style scoped></style>
