<script setup lang="ts">
import { useRequestURL } from '#app'
import { useAlertStore } from '@/stores'
import { MclFormGroup, MclInputText } from '@bobbykim/mcl-forms'
import type { H3Error } from 'h3'

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
  <div class="container px-xs py-xl lg:py-2xl">
    <div
      class="mx-auto max-w-[28rem] rounded-lg bg-light-3 px-xs py-md drop-shadow-md md:px-sm"
    >
      <h2 class="h2-md mb-sm text-center">Request Reset</h2>
      <form @submit.prevent="handleFormSubmit">
        <MclFormGroup
          field-id="email"
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
          class="btn btn-full text-light-3 btn-primary"
        >
          Submit
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped></style>
