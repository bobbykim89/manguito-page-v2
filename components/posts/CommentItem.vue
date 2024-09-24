<script setup lang="ts">
import { PopulatedCommentModel } from '@/server/models'

const props = defineProps<{
  isAdmin: boolean
  isAuthor: boolean
  comment: PopulatedCommentModel
}>()
const emit = defineEmits<{
  (e: 'delete-click', id: string): void
}>()

const onDelete = () => {
  const { comment } = props
  if (typeof comment._id !== 'string') return
  emit('delete-click', comment._id)
}
</script>

<template>
  <div
    class="bg-light-4 px-xs py-sm rounded-md overflow-x-hidden drop-shadow-md"
  >
    <p>{{ comment.text }}</p>
    <div class="text-end text-sm text-dark-1">
      <p>{{ comment?.author.name }}</p>
      <ClientOnly>
        <p>{{ new Date(comment.date).toDateString() }}</p>
      </ClientOnly>
      <div v-if="isAdmin || isAuthor" class="flex justify-end gap-2 mt-3xs">
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
</template>

<style scoped></style>
