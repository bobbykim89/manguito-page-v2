<script setup lang="ts">
import MclLogo from '@/assets/img/logo192.png'
import AuthBlock from '@/components/layout-components/AuthBlock.vue'
import { HeaderHorizontal } from '@bobbykim/manguito-theme'
import {
  MclFooterA,
  type MenuItemType,
  type SocialUrl,
} from '@bobbykim/mcl-footer'
import { reactive, ref } from 'vue'

const router = useRouter()
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
            :auth="false"
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
      </template>
    </HeaderHorizontal>
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
