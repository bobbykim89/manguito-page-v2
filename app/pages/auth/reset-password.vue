<script setup lang="ts">
import { MclFormGroup, MclInputText } from '@bobbykim/mcl-forms'
import type { H3Error } from 'h3'
import { useAlertStore } from '~/app/stores'

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
const alertStore = useAlertStore()
const passwordInputRef = ref<string>('')

const handleFormSubmit = async () => {
  const userId = route.query.user
  const token = route.query.token
  if (!userId) return
  if (!token) return
  if (passwordInputRef.value === '') return
  try {
    await $fetch('/api/token/reset-password', {
      method: 'POST',
      body: { userId, token, password: passwordInputRef.value },
    })
    alertStore.setAlert('Successfully updated password', 'success')
    router.push({ path: '/auth/login' })
  } catch (error) {
    alertStore.setAlert((error as H3Error).statusMessage!)
  }
}
</script>

<template>
  <div class="container py-xl lg:py-2xl px-xs">
    <div
      class="rounded-lg bg-light-3 py-md px-xs md:px-sm max-w-md mx-auto drop-shadow-md"
    >
      <h2 class="h2-md text-center mb-sm">Reset Password</h2>
      <form @submit.prevent="handleFormSubmit">
        <MclFormGroup
          label-for="new-password"
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
            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$"
            invalid-feedback="Password must include one number, one uppercase and lowercase letter, one special character with at least 8 characters length."
          ></MclInputText>
        </MclFormGroup>
        <button
          role="button"
          type="submit"
          class="btn btn-primary btn-full text-light-3"
        >
          Submit
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped></style>
