<script setup lang="ts">
import { useUserStore } from '@/stores'
import { MclFormGroup, MclInputText } from '@bobbykim/mcl-forms'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

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
  <div class="container px-xs py-xl lg:py-2xl">
    <div
      class="mx-auto max-w-[28rem] rounded-lg bg-light-3 px-xs py-md drop-shadow-md md:px-sm"
    >
      <h1 class="h3-md mb-sm text-center">Request Admin Privileges</h1>
      <form @submit.prevent="onSubmit">
        <MclFormGroup
          field-id="admin-phrase"
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
        <button type="submit" class="btn btn-full text-light-1 btn-primary">
          Submit
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped></style>
