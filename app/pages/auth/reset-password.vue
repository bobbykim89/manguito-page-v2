<script setup lang="ts">
import { MclFormGroup, MclInputText } from '@bobbykim/mcl-forms'

const url = useRequestURL()

definePageMeta({
  middleware: ['guest-route'],
})

useHead({
  title: 'Reset Password | Manguito Page',
  meta: [
    { property: 'og:title', content: 'Reset Password | Manguito Page' },
    { property: 'og:url', content: url.href },
    { property: 'twitter:domain', content: url.host },
    { property: 'twitter:url', content: url.href },
    {
      name: 'twitter:title',
      content: 'Reset Password | Manguito Page',
    },
  ],
})

const route = useRoute()
const router = useRouter()
const { run } = useApiAction()
const { $api } = useNuxtApp()
const passwordInputRef = ref<string>('')

const handleFormSubmit = async () => {
  const userId = route.query.user
  const token = route.query.token
  if (!userId) return
  if (!token) return
  if (passwordInputRef.value === '') return
  const done = await run(
    () =>
      $api('/api/token/reset-password', {
        method: 'POST',
        body: { userId, token, password: passwordInputRef.value },
      }),
    { success: 'Successfully updated password' },
  )
  if (done.ok) router.push({ path: '/auth/login' })
}
</script>

<template>
  <div class="container px-xs py-xl lg:py-2xl">
    <div
      class="mx-auto max-w-[28rem] rounded-lg bg-light-3 px-xs py-md drop-shadow-md md:px-sm"
    >
      <h1 class="h2-md mb-sm text-center">Reset Password</h1>
      <form @submit.prevent="handleFormSubmit">
        <MclFormGroup
          field-id="new-password"
          label="New Password:"
          :text-bold="true"
          class="mb-xs"
        >
          <MclInputText
            id="new-password"
            type="password"
            rounded
            required
            v-model="passwordInputRef"
            :pattern="passwordPattern"
            :invalid="breaksPasswordRule(passwordInputRef)"
            invalid-feedback="Password must include one number, one uppercase and lowercase letter, one special character with at least 8 characters length."
          ></MclInputText>
        </MclFormGroup>
        <button
          role="button"
          type="submit"
          class="btn btn-full text-light-1 btn-primary"
        >
          Submit
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped></style>
