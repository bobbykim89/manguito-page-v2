<script setup lang="ts">
import { MclFormGroup, MclInputText } from '@bobbykim/mcl-forms'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useUserStore } from '~/app/stores'

definePageMeta({
  middleware: ['auth-route'],
})

useHead({
  title: 'Admin - Request | Manguito Page',
  meta: [{ property: 'og:title', content: 'Admin - Request | Manguito Page' }],
})

const router = useRouter()
const userStore = useUserStore()
const { currentUser } = storeToRefs(userStore)
const phraseRef = ref<string>('')

const onSubmit = async () => {
  await userStore.setAdmin({ phrase: phraseRef.value })
  phraseRef.value = ''
  if (currentUser.value?.role === 'ADMIN') {
    router.push({ path: '/posts' })
  }
}
</script>

<template>
  <div class="container py-xl lg:py-2xl px-xs">
    <div
      class="rounded-lg bg-light-3 py-md px-xs md:px-sm max-w-md mx-auto drop-shadow-md"
    >
      <h3 class="h3-md text-center mb-sm">Request Admin Privileges</h3>
      <form @submit.prevent="onSubmit">
        <MclFormGroup
          label-for="admin-phrase"
          label="Secret phrase:"
          class="mb-xs"
        >
          <MclInputText
            id="admin-phrase"
            rounded
            type="password"
            required
            v-model="phraseRef"
          />
        </MclFormGroup>
        <button role="submit" class="btn btn-primary btn-full text-light-3">
          Submit
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped></style>
