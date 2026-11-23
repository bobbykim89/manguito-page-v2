<script setup lang="ts">
import { usePostStore } from '@/stores'
import { useIntersectionObserver } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'

/**
 * Sits after a list of the shared posts: loads the next page when it comes
 * near the viewport, shows where the list stands, and announces each change
 * to screen readers. After an error it waits for "Try again".
 */
const END = "That's every photo of Manguito!"

const postStore = usePostStore()
const { posts, status, loaded, nextCursor } = storeToRefs(postStore)

const sentinel = ref<HTMLElement | null>(null)
const inView = ref<boolean>(false)
const { pause, resume } = useIntersectionObserver(
  sentinel,
  (entries) => {
    const entry = entries.at(-1)
    if (entry) inView.value = entry.isIntersecting
  },
  // about a screen before the bottom
  { rootMargin: '0px 0px 100% 0px' },
)

watch([inView, status], ([visible, now], [, before]) => {
  if (before === 'loading' && now === 'idle') {
    // A page just landed, and its tiles may have pushed the sentinel away;
    // the last reading predates them. Observe afresh: a new observer reports
    // where the sentinel is now, and if it's still in view (a tall screen)
    // that loads the next page.
    inView.value = false
    pause()
    resume()
    return
  }
  // never on 'error': that waits for Try again
  if (visible && now === 'idle' && loaded.value && nextCursor.value)
    postStore.loadMore()
})

const announcement = ref<string>('')
let countBefore = 0
watch(status, (now, before) => {
  if (now === 'loading') {
    countBefore = posts.value.length
    announcement.value = 'Loading more photos…'
    return
  }
  if (now === 'error') {
    announcement.value = "Couldn't load more photos."
    return
  }
  if (before !== 'loading') return
  const added = posts.value.length - countBefore
  const end = now === 'done' ? END : ''
  announcement.value =
    added > 0 ? `Loaded ${added} more photos. ${end}`.trim() : end
})
</script>

<template>
  <div class="py-sm text-center text-dark-1">
    <div ref="sentinel" aria-hidden="true" class="h-px"></div>
    <p v-if="status === 'loading'">Loading more photos…</p>
    <p v-else-if="status === 'done' && posts.length > 0">{{ END }}</p>
    <p v-else-if="status === 'done'">No photos yet.</p>
    <template v-else-if="status === 'error'">
      <p>Couldn't load more photos.</p>
      <button
        type="button"
        class="btn mt-2xs text-light-1 btn-primary"
        @click="postStore.retry()"
      >
        Try again
      </button>
    </template>
    <p role="status" aria-live="polite" class="sr-only">{{ announcement }}</p>
  </div>
</template>
