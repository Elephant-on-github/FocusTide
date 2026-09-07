<script setup lang="ts">
import { IconCheck as CompleteIcon } from '@tabler/icons-vue'
</script>

<template>
  <div class="timer-complete-icon">
    <CompleteIcon />
  </div>
</template>

<style lang="scss" scoped>
.timer-complete-icon svg {
  width: clamp(3rem, 20vmin, 10rem) !important;
  height: clamp(3rem, 20vmin, 10rem) !important;
}
</style>
