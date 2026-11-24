<script setup lang="ts">
/**
 * A date in the visitor's own timezone, in English ("Fri, Nov 20, 2026").
 * NuxtTime renders it on the server and rewrites the text for the browser's
 * timezone before hydration, so the two always agree.
 */
defineProps<{ datetime: string | Date }>()
</script>

<template>
  <NuxtTime
    :datetime="datetime"
    locale="en-US"
    weekday="short"
    month="short"
    day="numeric"
    year="numeric"
  />
</template>
