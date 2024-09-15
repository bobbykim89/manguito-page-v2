<script setup lang="ts">
import { UserInput } from '@/server/controller/user/dto'
import { useUserStore } from '@/stores'
import { MclFormGroup, MclInputText } from '@bobbykim/mcl-forms'
import { storeToRefs } from 'pinia'
import { reactive, ref } from 'vue'

useHead({
  title: 'Signup | Manguito Page',
  meta: [
    { name: 'description', content: 'Signup page' },
    { property: 'og:title', content: 'Signup | Manguito Page' },
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
  <div class="container py-xl lg:py-2xl px-xs">
    <div
      class="rounded-lg bg-light-3 py-md px-xs md:px-sm max-w-md mx-auto drop-shadow-md"
    >
      <h2 class="h2-md text-center mb-sm">Signup</h2>
      <form @submit.prevent="onSubmit">
        <MclFormGroup label-for="signup-name" label="Name:" class="mb-xs">
          <MclInputText
            id="signup-name"
            rounded
            requird
            v-model="userInfo.name"
          />
        </MclFormGroup>
        <MclFormGroup label-for="signup-email" label="Email:" class="mb-xs">
          <MclInputText
            id="signup-email"
            rounded
            type="email"
            required
            v-model="userInfo.email"
          />
        </MclFormGroup>
        <MclFormGroup label-for="signup-pw" label="Password:" class="mb-xs">
          <MclInputText
            id="signup-pw"
            rounded
            type="password"
            required
            v-model="userInfo.password"
            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$"
            invalid-feedback="Password must include one number, one uppercase and lowercase letter, one special character with at least 8 characters length."
          />
        </MclFormGroup>
        <MclFormGroup
          label-for="signup-pw-confirm"
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
        <button role="submit" class="btn btn-primary btn-full text-light-3">
          Submit
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped></style>
