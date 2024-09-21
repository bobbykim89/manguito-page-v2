<script setup lang="ts">
import { PopulatedPostModel } from '@/server/models'
import { MclFormGroup, MclTextArea } from '@bobbykim/mcl-forms'
import { Transition, ref } from 'vue'

const props = defineProps<{
  isAdmin: boolean
  isAuthor: boolean
  post: PopulatedPostModel
}>()
const emit = defineEmits<{
  (e: 'on-toggle', event: Event): void
  (e: 'on-save', content: string): void
  (e: 'on-delete', event: Event): void
}>()

const isEditMode = ref<boolean>(false)
const contentTextRef = ref<string>('')

const onToggle = (e: Event) => {
  const { post } = props
  if (post.content) {
    contentTextRef.value = post.content
  }
  isEditMode.value = !isEditMode.value
  emit('on-toggle', e)
}
const onSave = () => {
  emit('on-save', contentTextRef.value)
  isEditMode.value = false
}
const onDelete = (e: Event) => {
  emit('on-delete', e)
}
</script>

<template>
  <div class="bg-light-4 px-xs py-sm rounded-md overflow-x-hidden">
    <Transition name="page" mode="out-in">
      <div v-if="!isEditMode">
        <p>
          {{ post.content }}
        </p>
        <div class="text-end text-sm text-dark-1">
          <p>{{ post?.author.name }}</p>
          <ClientOnly>
            <p>{{ new Date(post.date).toDateString() }}</p>
          </ClientOnly>
          <div v-if="isAdmin || isAuthor" class="flex justify-end gap-2 mt-3xs">
            <!-- edit -->
            <button
              v-if="isAuthor"
              class="hover:opacity-65 duration-300 ease-linear"
              aria-label="edit-post"
              @click="onToggle"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                fill="currentColor"
                class="w-[20px] aspect-square"
              >
                <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
                <path
                  d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160L0 416c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-96c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 96c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 64z"
                />
              </svg>
            </button>
            <!-- delete -->
            <button
              class="hover:opacity-65 duration-300 ease-linear"
              aria-label="delete post"
              @click="onDelete"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 448 512"
                fill="currentColor"
                class="w-[20px] aspect-square"
              >
                <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
                <path
                  d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div v-else>
        <form @submit.prevent="onSave">
          <MclFormGroup label-for="edit-content" label="Edit content:">
            <MclTextArea
              id="edit-content"
              bg-color="light-3"
              rounded
              :rows="3"
              v-model="contentTextRef"
            />
          </MclFormGroup>
          <div class="flex justify-end gap-2 mt-3xs text-dark-1">
            <!-- cancel -->
            <button
              class="hover:opacity-65 duration-300 ease-linear"
              type="reset"
              aria-label="cancel edit"
              @click="onToggle"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                fill="currentColor"
                class="w-[20px] aspect-square"
              >
                <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
                <path
                  d="M367.2 412.5L99.5 144.8C77.1 176.1 64 214.5 64 256c0 106 86 192 192 192c41.5 0 79.9-13.1 111.2-35.5zm45.3-45.3C434.9 335.9 448 297.5 448 256c0-106-86-192-192-192c-41.5 0-79.9 13.1-111.2 35.5L412.5 367.2zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z"
                />
              </svg>
            </button>
            <!-- save -->
            <button
              class="hover:opacity-65 duration-300 ease-linear"
              type="submit"
              role="button"
              aria-label="save changes"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 448 512"
                fill="currentColor"
                class="w-[20px] aspect-square"
              >
                <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
                <path
                  d="M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-242.7c0-17-6.7-33.3-18.7-45.3L352 50.7C340 38.7 323.7 32 306.7 32L64 32zm0 96c0-17.7 14.3-32 32-32l192 0c17.7 0 32 14.3 32 32l0 64c0 17.7-14.3 32-32 32L96 224c-17.7 0-32-14.3-32-32l0-64zM224 288a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"
                />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>

<style scoped></style>
