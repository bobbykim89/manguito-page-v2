<script setup lang="ts">
import { UserModel, UserRoleType } from '@/server/models'
import { useAlertStore } from '@/stores'
import { Modal } from '@bobbykim/manguito-theme'
import { MclInputRadio } from '@bobbykim/mcl-forms'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-route'],
})

useHead({
  title: 'Admin - Users | Manguito Page',
  meta: [{ property: 'og:title', content: 'Admin - Users | Manguito Page' }],
})

const cookie = useAuthToken()
const alertStore = useAlertStore()
const modalRef = ref<InstanceType<typeof Modal>>()
const selectedUser = ref<UserModel | null>(null)
const selectedRole = ref<UserRoleType>('USER')
const roleOptions: UserRoleType[] = ['MANAGER', 'USER']

const { data: res, refresh } = await useFetch<UserModel[]>('/api/user/admin', {
  method: 'GET',
  headers: { Authorization: cookie.value ? cookie.value : '' },
})
const openEdit = (user: UserModel) => {
  selectedUser.value = user
  selectedRole.value = user.role
  modalRef.value?.open()
}
const onModalClose = () => {
  selectedUser.value = null
  selectedRole.value = 'USER'
}
const onOptionChange = (e: Event, value: UserRoleType) => {
  e.preventDefault()
  selectedRole.value = value
}
const onSubmit = async () => {
  if (!cookie.value) return
  if (selectedUser.value === null) return
  await $fetch(`/api/user/admin/${selectedUser.value._id}`, {
    method: 'PUT',
    headers: { Authorization: cookie.value },
    body: { role: selectedRole.value },
  })
  onModalClose()
  refresh()
  alertStore.setAlert('Successfully updated user role', 'success')
  modalRef.value?.close()
}
</script>

<template>
  <div class="relative font-inter max-w-screen-md mx-auto py-md px-2xs">
    <h2 class="h2-md mb-xs">Users</h2>
    <div class="grid gap-2">
      <div
        v-for="user in res"
        :key="user._id!.toString()"
        class="bg-light-4 px-xs py-sm rounded-md overflow-x-hidden drop-shadow-md flex flex-col md:flex-row gap-4 justify-between"
      >
        <div class="w-full">
          <p>Username: {{ user.name }}</p>
          <p>Email: {{ user.email }}</p>
          <p>Role: {{ user.role }}</p>
        </div>
        <div class="flex items-center justify-end md:justify-center">
          <!-- delete -->
          <button
            class="hover:opacity-65 duration-300 ease-linear text-dark-1"
            aria-label="delete post"
            @click="openEdit(user)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 512"
              fill="currentColor"
              class="w-[20px] aspect-square"
            >
              <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
              <path
                d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l293.1 0c-3.1-8.8-3.7-18.4-1.4-27.8l15-60.1c2.8-11.3 8.6-21.5 16.8-29.7l40.3-40.3c-32.1-31-75.7-50.1-123.9-50.1l-91.4 0zm435.5-68.3c-15.6-15.6-40.9-15.6-56.6 0l-29.4 29.4 71 71 29.4-29.4c15.6-15.6 15.6-40.9 0-56.6l-14.4-14.4zM375.9 417c-4.1 4.1-7 9.2-8.4 14.9l-15 60.1c-1.4 5.5 .2 11.2 4.2 15.2s9.7 5.6 15.2 4.2l60.1-15c5.6-1.4 10.8-4.3 14.9-8.4L576.1 358.7l-71-71L375.9 417z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
    <Modal
      ref="modalRef"
      title="Update user role"
      backdrop-color="dark-3"
      :class-name="['rounded-lg']"
      @close="onModalClose"
    >
      <template #body="{ close }">
        <div class="px-xs py-sm">
          <p class="font-bold">Selected User:</p>
          <p>Username: {{ selectedUser?.name }}</p>
          <p>Email: {{ selectedUser?.email }}</p>
          <p class="font-bold tracking-wider">User role:</p>
          <form @submit.prevent="onSubmit">
            <div
              v-for="(role, idx) in roleOptions"
              :key="idx"
              class="flex gap-1 mb-3xs"
            >
              <MclInputRadio
                :id="`option-${role.toLowerCase()}`"
                :value="role"
                :checked="role === selectedRole"
                bg-color="primary"
                @change="onOptionChange!"
              />
              <label :for="`option-${role.toLowerCase()}`" class="capitalize">{{
                role
              }}</label>
            </div>
            <div class="flex justify-end gap-2">
              <button class="btn btn-primary" role="button" type="submit">
                Submit
              </button>
              <button
                class="btn btn-warning"
                role="button"
                type="reset"
                @click="close"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped></style>
