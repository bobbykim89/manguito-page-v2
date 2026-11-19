<script setup lang="ts">
import { useRequestURL } from '#app'
import { AuthInput } from '#shared/dto/auth'
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
const route = useRoute()
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
  <div class="container px-xs py-xl lg:py-2xl">
    <div
      class="mx-auto max-w-md rounded-lg bg-light-3 px-xs py-md drop-shadow-md md:px-sm"
    >
      <h2 class="h2-md mb-sm text-center">Login</h2>
      <p
        v-if="route.query.reason === 'expired'"
        role="status"
        class="mb-sm text-center"
      >
        Your session expired, please log in again.
      </p>
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
        <button role="submit" class="btn btn-full text-light-3 btn-primary">
          Submit
        </button>
      </form>
      <div class="mt-sm text-center text-dark-3">
        <span>Don't have accout? Click</span>
        <NuxtLink
          to="/auth/signup"
          class="mcl-link mx-3xs font-bold text-primary"
          >SignUp</NuxtLink
        >
      </div>
      <div class="mt-2xs text-center text-dark-3">
        <span>Forgot Password? Click</span>
        <NuxtLink
          to="/auth/request"
          class="mcl-link mx-3xs font-bold text-primary"
          >Here</NuxtLink
        >
      </div>
    </div>
  </div>
</template>

<style scoped></style>
