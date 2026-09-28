<template lang="pug">
Icon.ui-icon(
  :name="iconName",
  :size="size",
  :aria-hidden="label ? undefined : 'true'",
  :aria-label="label",
  :role="label ? 'img' : undefined"
)
</template>

<script setup lang="ts">
/**
 * Site icon — Lucide via @nuxt/icon, rendered as inline SVG (`currentColor`, so it follows
 * text colour, forced-colors / high-contrast mode and user font overrides).
 * Decorative by default (`aria-hidden`): the control next to it carries the name.
 * Pass `label` only for a standalone meaningful icon (it becomes `role="img"`).
 * Icon-only buttons put their name on the button (`aria-label`), not here.
 * Names: https://lucide.dev/icons (e.g. `external-link`, `copy`, `download`).
 */
const props = withDefaults(
  defineProps<{
    name: string;
    label?: string;
    size?: string;
  }>(),
  { label: undefined, size: '1.15em' }
);

const iconName = computed(() => (props.name.includes(':') ? props.name : `lucide:${props.name}`));
</script>

<style lang="scss" scoped>
.ui-icon {
  flex: 0 0 auto;
  vertical-align: -0.15em;
}
</style>
