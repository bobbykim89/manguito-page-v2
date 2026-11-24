<script setup lang="ts">
import { AccordionGroup, Collapse } from '@bobbykim/manguito-theme'
import { useCollapseTrigger } from '@bobbykim/manguito-theme/composable'
import { LIMITS } from '#shared/dto/limits'
import { MclFormGroup, MclInputText } from '@bobbykim/mcl-forms'
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'on-username-update', event: Event, name: string): void
  (e: 'on-pw-update', event: Event, currentPw: string, newPw: string): void
}>()

const usernameRef = ref<string>('')
const currentPasswordRef = ref<string>('')
const newPasswordRef = ref<string>('')

const usernamePanel = ref<InstanceType<typeof Collapse>>()
const passwordPanel = ref<InstanceType<typeof Collapse>>()
const usernameTrigger = useCollapseTrigger(usernamePanel, {
  id: 'update-username',
})
const passwordTrigger = useCollapseTrigger(passwordPanel, {
  id: 'update-password',
})

const onUsernameUpdateSubmit = (e: Event) => {
  if (usernameRef.value.trim() === '') {
    e.preventDefault()
    return
  }
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
  <AccordionGroup class="rounded-md bg-light-4 px-2xs py-xs drop-shadow-md">
    <!-- username update -->
    <div class="mb-xs overflow-hidden rounded-md drop-shadow-md">
      <button
        class="block w-full bg-light-3 px-xs py-3xs text-left transition-colors duration-300 ease-linear hover:bg-light-3/60 focus-visible:mcl-focus-ring focus-visible:outline-offset-[-3px]"
        type="button"
        v-bind="usernameTrigger.attrs.value"
        @click="usernameTrigger.toggle()"
      >
        Update Username
      </button>
      <Collapse
        ref="usernamePanel"
        id="update-username"
        custom-class="bg-light-3/65"
      >
        <div class="px-2xs py-xs">
          <form @submit.prevent="onUsernameUpdateSubmit">
            <MclFormGroup field-id="user-name" label="Username:">
              <MclInputText
                id="user-name"
                :max-length="LIMITS.username"
                v-model="usernameRef"
                rounded
                required
              />
            </MclFormGroup>
            <div class="mt-3xs flex justify-end">
              <button type="submit" class="btn text-light-1 btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      </Collapse>
    </div>

    <!-- pw update -->
    <div class="overflow-hidden rounded-md drop-shadow-md">
      <button
        class="block w-full bg-light-3 px-xs py-3xs text-left transition-colors duration-300 ease-linear hover:bg-light-3/60 focus-visible:mcl-focus-ring focus-visible:outline-offset-[-3px]"
        type="button"
        v-bind="passwordTrigger.attrs.value"
        @click="passwordTrigger.toggle()"
      >
        Update Password
      </button>
      <Collapse
        ref="passwordPanel"
        id="update-password"
        custom-class="bg-light-3/65"
      >
        <div class="px-2xs py-xs">
          <form @submit.prevent="onPwUpdateSubmit">
            <MclFormGroup field-id="current-pw" label="Current password:">
              <MclInputText
                id="current-pw"
                rounded
                v-model="currentPasswordRef"
                required
                type="password"
              />
            </MclFormGroup>
            <MclFormGroup field-id="new-pw" label="New password:">
              <MclInputText
                id="new-pw"
                rounded
                required
                v-model="newPasswordRef"
                type="password"
              />
            </MclFormGroup>
            <div class="mt-3xs flex justify-end">
              <button type="submit" class="btn text-light-1 btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      </Collapse>
    </div>
  </AccordionGroup>
</template>

<style scoped></style>
