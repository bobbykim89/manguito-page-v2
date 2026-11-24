<script setup lang="ts">
import { postAlt } from '@/utils/postAlt'
import { nextTick, ref } from 'vue'

/**
 * A Home photo tile: a coloured face that flips over to show the photo, then
 * opens its post. Replaces MclCardC, whose clickable div a keyboard can't
 * reach. Before the flip it's a button ("Flip photo N"); after, a link named
 * by the post's caption, and focus moves to it.
 */
const props = defineProps<{
  imageSource: string
  caption: string
  to: string
  index: number
  color: 'primary' | 'info'
}>()

// written out so Tailwind sees both classes
const faceClass = { primary: 'mcl-bg-primary', info: 'mcl-bg-info' }

const flipped = ref<boolean>(false)
const linkRef = ref<{ $el: HTMLElement } | null>(null)

const flip = async () => {
  flipped.value = true
  await nextTick()
  linkRef.value?.$el.focus()
}
</script>

<template>
  <!-- the ring goes on this unclipped wrapper: the tile's overflow-hidden
       would cut off a ring drawn outside the button or link -->
  <div class="tile-perspective has-[:focus-visible]:mcl-focus-ring">
    <div
      :class="[
        'tile relative aspect-square max-h-100 overflow-hidden transition duration-1600 motion-reduce:transition-none',
        faceClass[props.color],
        { 'tile-flipped': flipped },
      ]"
    >
      <button
        v-if="!flipped"
        type="button"
        :aria-label="`Flip photo ${index}`"
        class="absolute inset-0 h-full w-full cursor-pointer outline-none"
        @click="flip"
      ></button>
      <NuxtLink
        v-else
        ref="linkRef"
        :to="to"
        class="absolute inset-0 block outline-none"
      >
        <Transition
          appear
          enter-from-class="opacity-0"
          enter-active-class="transition-opacity delay-500 duration-800 motion-reduce:delay-0 motion-reduce:transition-none"
        >
          <img
            :src="imageSource"
            :alt="postAlt(caption)"
            class="aspect-square h-full w-full object-cover object-center"
          />
        </Transition>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
/* the flip MclCardC used: a full turn around the vertical axis */
.tile-perspective {
  perspective: 1800px;
}
.tile {
  transform-style: preserve-3d;
  transform: rotateY(0);
  backface-visibility: hidden;
}
.tile-flipped {
  transform: rotateY(360deg);
}
</style>
