<template lang="pug">
ClientOnly
  PrimeToast(v-if="isPrimeVue", position="top-right")
  .ui-toast-host(v-else, aria-live="polite")
    TransitionGroup(name="ui-toast")
      .p-toast-message(
        v-for="item in nativeToasts",
        :key="item.id",
        :class="`p-toast-message-${item.severity}`",
        role="status"
      )
        .p-toast-message-content
          span.p-toast-summary(v-if="item.summary") {{ item.summary }}
          .p-toast-detail(v-if="item.detail") {{ item.detail }}
</template>

<script setup lang="ts">
/**
 * Mount once at the app root (`app.vue`). PrimeVue uses ToastService; native
 * falls back to the shared bus from `useAppToast`.+
 */
import { nativeToasts } from '@/composables/useAppToast';

const { isPrimeVue } = useUiStack();

void nativeToasts;
</script>

<style lang="scss" scoped>
.ui-toast-host {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1100;
  display: grid;
  gap: 0.5rem;
  width: min(22rem, calc(100vw - 2rem));
  pointer-events: none;
}

.p-toast-message {
  pointer-events: auto;
  padding: 0.85rem 1rem;
  border-radius: var(--border-radius-md, 0.5rem);
  background: color-mix(in srgb, var(--surface-color) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
  box-shadow: 0 0.35rem 1rem color-mix(in srgb, var(--text-color) 12%, transparent);
}

.p-toast-summary {
  display: block;
  font-weight: 700;
}

.p-toast-detail {
  margin-top: 0.25rem;
  font-size: var(--font-size-sm);
}

.ui-toast-enter-active,
.ui-toast-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.ui-toast-enter-from,
.ui-toast-leave-to {
  opacity: 0;
  transform: translateY(-0.35rem);
}
</style>
