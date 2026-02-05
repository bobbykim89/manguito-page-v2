<script setup lang="ts">
import { MclFormGroup, MclTextArea } from '@bobbykim/mcl-forms'
import { ref } from 'vue'

const commentRef = ref<string>('')

const emit = defineEmits<{
  (e: 'submit-comment', content: string): void
}>()
const submitComment = () => {
  if (commentRef.value === '') return
  emit('submit-comment', commentRef.value)
  commentRef.value = ''
}
</script>

<template>
  <div
    class="bg-light-4 px-xs py-xs rounded-md overflow-x-hidden drop-shadow-md"
  >
    <form @submit.prevent="submitComment">
      <MclFormGroup label-for="comment-input" label="Comment:">
        <MclTextArea
          id="comment-input"
          bg-color="light-3"
          rounded
          :rows="3"
          placeholder="Please write comment here"
          v-model="commentRef"
        />
        <div class="flex justify-end gap-2 mt-3xs text-dark-1">
          <button
            class="hover:opacity-65 duration-300 ease-linear"
            type="submit"
            role="button"
            aria-label="post comment"
            :disabled="commentRef === ''"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              fill="currentColor"
              class="w-[20px] aspect-square"
            >
              <!-- !Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
              <path
                d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z"
              />
            </svg>
          </button>
        </div>
      </MclFormGroup>
    </form>
  </div>
</template>

<style scoped></style>
