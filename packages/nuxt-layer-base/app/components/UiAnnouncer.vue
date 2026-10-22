<script setup lang="ts">
import { useA11yAnnouncer } from '../composables/useA11yAnnouncer';

const { message, politeness } = useA11yAnnouncer();
</script>

<template>
  <div class="ui-announcer sr-only" :aria-live="politeness" aria-atomic="true" role="status">
    {{ message }}
  </div>
</template>

<style lang="scss" scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
