<script setup lang="ts">
import { Collapse, vCollapse } from '@bobbykim/manguito-theme'
import { MclFormGroup, MclInputText } from '@bobbykim/mcl-forms'
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'on-username-update', event: Event, name: string): void
  (e: 'on-pw-update', event: Event, currentPw: string, newPw: string): void
}>()

const usernameRef = ref<string>('')
const currentPasswordRef = ref<string>('')
const newPasswordRef = ref<string>('')

const onUsernameUpdateSubmit = (e: Event) => {
  emit('on-username-update', e, usernameRef.value)
  usernameRef.value = ''
}
const onPwUpdateSubmit = (e: Event) => {
  emit('on-pw-update', e, currentPasswordRef.value, newPasswordRef.value)
  currentPasswordRef.value = ''
  newPasswordRef.value = ''
}
</script>

<template>
  <div class="px-2xs py-xs bg-light-4 rounded-md drop-shadow-md">
    <!-- username update -->
    <div class="rounded-md drop-shadow-md overflow-hidden mb-xs">
      <button
        class="block w-full py-3xs px-xs bg-light-3 hover:bg-opacity-60 transition-colors duration-300 ease-linear text-left"
        v-collapse:update-username
      >
        Update Username
      </button>
      <Collapse
        id="update-username"
        accordion="update-user"
        class-name="bg-light-3/65"
      >
        <div class="py-xs px-2xs">
          <form @submit.prevent="onUsernameUpdateSubmit">
            <MclFormGroup label-for="user-name" label="Username:">
              <MclInputText
                id="user-name"
                v-model="usernameRef"
                rounded
                required
              />
            </MclFormGroup>
            <div class="flex justify-end mt-3xs">
              <button role="submit" class="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      </Collapse>
    </div>

    <!-- pw update -->
    <div class="rounded-md drop-shadow-md overflow-hidden">
      <button
        class="block w-full py-3xs px-xs bg-light-3 hover:bg-opacity-60 transition-colors duration-300 ease-linear text-left"
        v-collapse:update-password
      >
        Update Username
      </button>
      <Collapse
        id="update-password"
        accordion="update-user"
        class-name="bg-light-3/65"
      >
        <div class="py-xs px-2xs">
          <form @submit.prevent="onPwUpdateSubmit">
            <MclFormGroup label-for="current-pw" label="Current password:">
              <MclInputText
                id="current-pw"
                rounded
                v-model="currentPasswordRef"
                required
                type="password"
              />
            </MclFormGroup>
            <MclFormGroup label-for="new-pw" label="New password:">
              <MclInputText
                id="new-pw"
                rounded
                required
                v-model="newPasswordRef"
                type="password"
              />
            </MclFormGroup>
            <div class="flex justify-end mt-3xs">
              <button role="submit" class="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      </Collapse>
    </div>
  </div>
</template>

<style scoped></style>
