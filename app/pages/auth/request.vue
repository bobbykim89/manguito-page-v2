<script setup lang="ts">
import { useRequestURL } from '#app'
import { MclFormGroup, MclInputText } from '@bobbykim/mcl-forms'

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
const { run } = useApiAction()
const { $api } = useNuxtApp()
const emailInputRef = ref<string>('')

const handleFormSubmit = async () => {
  if (emailInputRef.value === '') return
  const done = await run(
    () =>
      $api('/api/token/send-token', {
        method: 'POST',
        body: { email: emailInputRef.value },
      }),
    { success: "If that email has an account, we've sent a reset link." },
  )
  if (done.ok) router.push({ path: '/auth/login' })
}
</script>

<template>
  <div class="container px-xs py-xl lg:py-2xl">
    <div
      class="mx-auto max-w-[28rem] rounded-lg bg-light-3 px-xs py-md drop-shadow-md md:px-sm"
    >
      <h1 class="h2-md mb-sm text-center">Request Reset</h1>
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
          class="btn btn-full text-light-1 btn-primary"
        >
          Submit
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped></style>
