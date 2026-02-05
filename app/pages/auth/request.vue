<script setup lang="ts">
import { useRequestURL } from '#app'
import { MclFormGroup, MclInputText } from '@bobbykim/mcl-forms'
import type { H3Error } from 'h3'
import { useAlertStore } from '~/app/stores'

const url = useRequestURL()

definePageMeta({
  middleware: ['guest-route'],
})

useHead({
  title: 'Request Reset | Manguito Page',
  meta: [
    { property: 'og:title', content: 'Request Reset | Manguito Page' },
    { property: 'og:url', content: url.href },
    { property: 'twitter:domain', content: url.host },
    { property: 'twitter:url', content: url.href },
    {
      name: 'twitter:title',
      content: 'Request Reset | Manguito Page',
    },
  ],
})

const router = useRouter()
const alertStore = useAlertStore()
const emailInputRef = ref<string>('')

const handleFormSubmit = async () => {
  if (emailInputRef.value === '') return
  try {
    await $fetch('/api/token/send-token', {
      method: 'POST',
      body: { email: emailInputRef.value, url: url.origin },
    })
    alertStore.setAlert('Please check your email', 'success')
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
      <h2 class="h2-md text-center mb-sm">Request Reset</h2>
      <form @submit.prevent="handleFormSubmit">
        <MclFormGroup
          label-for="email"
          label="Email:"
          :text-bold="true"
          class="mb-xs"
        >
          <MclInputText
            id="email"
            type="email"
            placeholder="example@email.com"
            rounded
            required
            v-model="emailInputRef"
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
