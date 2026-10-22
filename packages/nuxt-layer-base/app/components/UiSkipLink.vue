<script setup lang="ts">
withDefaults(
  defineProps<{
    targetId?: string;
    label?: string;
  }>(),
  {
    targetId: 'main-content',
    label: 'Skip to main content',
  }
);
</script>

<template>
  <a :href="`#${targetId}`" class="ui-skip-link">
    {{ label }}
  </a>
</template>

<style lang="scss" scoped>
.ui-skip-link {
  position: absolute;
  top: -9999px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  padding: 0.75rem 1.5rem;
  background-color: var(--theme-paper-color, #ffffff);
  color: var(--theme-primary-ink-color, #111827);
  font-weight: 600;
  font-size: 1rem;
  text-decoration: underline;
  border-radius: 0 0 0.5rem 0.5rem;
  border: 2px solid var(--theme-focus-ring-color, #0284c7);
  outline: none;

  &:focus,
  &:focus-visible {
    top: 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }
}
</style>
