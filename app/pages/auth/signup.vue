<script setup lang="ts">
import { useRequestURL } from '#app'
import { LIMITS } from '#shared/dto/limits'
import { UserInput } from '#shared/dto/user'
import { useUserStore } from '@/stores'
import { MclFormGroup, MclInputText } from '@bobbykim/mcl-forms'
import { storeToRefs } from 'pinia'
import { reactive, ref } from 'vue'

const url = useRequestURL()

definePageMeta({
  middleware: ['guest-route'],
})

useHead({
  title: 'Signup | Manguito Page',
  meta: [
    { property: 'og:title', content: 'Signup | Manguito Page' },
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
const userInfo = reactive<UserInput>({
  name: '',
  email: '',
  password: '',
})
const confirmPassword = ref<string>('')
const onSubmit = async () => {
  if (userInfo.password === confirmPassword.value) {
    await userStore.signupUser(userInfo)
  }
  userInfo.email = ''
  userInfo.name = ''
  userInfo.password = ''
  if (currentUser.value !== null) {
    router.push({ path: '/posts' })
  }
}
</script>

<template>
  <div class="container px-xs py-xl lg:py-2xl">
    <div
      class="mx-auto max-w-[28rem] rounded-lg bg-light-3 px-xs py-md drop-shadow-md md:px-sm"
    >
      <h2 class="h2-md mb-sm text-center">Signup</h2>
      <form @submit.prevent="onSubmit">
        <MclFormGroup field-id="signup-name" label="Name:" class="mb-xs">
          <MclInputText
            id="signup-name"
            :max-length="LIMITS.username"
            rounded
            requird
            v-model="userInfo.name"
          />
        </MclFormGroup>
        <MclFormGroup field-id="signup-email" label="Email:" class="mb-xs">
          <MclInputText
            id="signup-email"
            rounded
            type="email"
            required
            v-model="userInfo.email"
          />
        </MclFormGroup>
        <MclFormGroup field-id="signup-pw" label="Password:" class="mb-xs">
          <MclInputText
            id="signup-pw"
            rounded
            type="password"
            required
            v-model="userInfo.password"
            :pattern="passwordPattern"
            :invalid="breaksPasswordRule(userInfo.password)"
            invalid-feedback="Password must include one number, one uppercase and lowercase letter, one special character with at least 8 characters length."
          />
        </MclFormGroup>
        <MclFormGroup
          field-id="signup-pw-confirm"
          label="Confirm Password:"
          class="mb-xs"
        >
          <MclInputText
            id="signup-pw-confirm"
            rounded
            type="password"
            required
            v-model="confirmPassword"
          />
        </MclFormGroup>
        <button role="submit" class="btn btn-full text-light-3 btn-primary">
          Submit
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped></style>
