<script setup lang="ts">
import { useRequestURL } from '#app'
import { AuthInput } from '@/server/controller/auth/dto'
import { useUserStore } from '@/stores'
import { MclFormGroup, MclInputText } from '@bobbykim/mcl-forms'
import { storeToRefs } from 'pinia'
import { reactive } from 'vue'

const url = useRequestURL()

definePageMeta({
  middleware: ['guest-route'],
})

useHead({
  title: 'Login | Manguito Page',
  meta: [
    { property: 'og:title', content: 'Login | Manguito Page' },
    { property: 'og:url', content: url.href },
    { property: 'twitter:domain', content: url.host },
    { property: 'twitter:url', content: url.href },
    {
      name: 'twitter:title',
      content: 'Login | Manguito Page',
    },
  ],
})

const router = useRouter()
const userStore = useUserStore()
const { currentUser } = storeToRefs(userStore)
const loginCred = reactive<AuthInput>({
  email: '',
  password: '',
})
const onSubmit = async () => {
  await userStore.loginWithCredential(loginCred)
  loginCred.email = ''
  loginCred.password = ''
  if (currentUser.value !== null) {
    router.push({ path: '/posts' })
  }
}
</script>

<template>
  <div class="container py-xl lg:py-2xl px-xs">
    <div
      class="rounded-lg bg-light-3 py-md px-xs md:px-sm max-w-md mx-auto drop-shadow-md"
    >
      <h2 class="h2-md text-center mb-sm">Login</h2>
      <form @submit.prevent="onSubmit">
        <MclFormGroup label-for="login-email" label="Email:" class="mb-xs">
          <MclInputText
            id="login-email"
            rounded
            type="email"
            required
            v-model="loginCred.email"
          />
        </MclFormGroup>
        <MclFormGroup label-for="login-pw" label="Password:" class="mb-xs">
          <MclInputText
            id="login-pw"
            rounded
            type="password"
            required
            v-model="loginCred.password"
          />
        </MclFormGroup>
        <button role="submit" class="btn btn-primary btn-full text-light-3">
          Submit
        </button>
      </form>
      <div class="mt-sm text-dark-3 text-center">
        <span>Don't have accout? Click</span>
        <NuxtLink
          to="/auth/signup"
          class="mx-3xs font-bold mcl-link text-primary"
          >SignUp</NuxtLink
        >
      </div>
    </div>
  </div>
</template>

<style scoped></style>
