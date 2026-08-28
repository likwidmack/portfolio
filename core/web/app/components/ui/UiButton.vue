<template lang="pug">
PrimeButton(
  v-if="isPrimeVue",
  v-bind="$attrs",
  :label="label",
  :icon="icon",
  :aria-label="ariaLabel",
  :severity="severity",
  :variant="variant",
  :type="type",
  :disabled="disabled"
)
  slot
button.p-button.p-component(
  v-else,
  v-bind="$attrs",
  :type="type",
  :disabled="disabled",
  :aria-label="ariaLabel ?? label",
  :class="_nativeClass"
)
  i.p-button-icon(v-if="icon", :class="icon", aria-hidden="true")
  span.p-button-label(v-if="label") {{ label }}
  slot
</template>

<script setup lang="ts">
/** Button — PrimeVue `Button`, else native control with classic `p-button` classes (theme `@layer primevue`). */
defineOptions({
  inheritAttrs: false,
});

const { isPrimeVue } = useUiStack();

const props = withDefaults(
  defineProps<{
    label?: string;
    icon?: string;
    ariaLabel?: string;
    severity?: 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast' | 'help';
    variant?: 'outlined' | 'text' | 'link';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }>(),
  {
    type: 'button',
    disabled: false,
  }
);

const _nativeClass = computed(() => {
  const classes: string[] = [];
  if (props.variant === 'outlined') {
    classes.push('p-button-outlined');
  } else if (props.variant === 'text') {
    classes.push('p-button-text');
  } else if (props.variant === 'link') {
    classes.push('p-button-link');
  }
  if (props.severity) {
    classes.push(`p-button-${props.severity}`);
  }
  if (props.icon && !props.label) {
    classes.push('p-button-icon-only');
  }
  return classes;
});
</script>

<style lang="scss" scoped>
// Thin polish only — fill/severity colors come from Nora preset + `_primevue-union`.
.p-button {
  border-radius: var(--button-radius, var(--border-radius-md, 0.5rem));
  box-shadow: var(--button-shadow);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    background-color 220ms ease,
    border-color 180ms ease,
    color 180ms ease,
    filter 180ms ease;

  &[href] {
    text-decoration: none;
    color: var(--text-secondary-color, var(--button-fg));

    &:hover,
    &:focus,
    &:active {
      text-decoration: none;
    }
  }

  &:focus-visible,
  &:focus {
    box-shadow:
      0 0 0 3px var(--focus-ring),
      var(--button-shadow-hover, var(--button-shadow));
  }

  &:not([disabled]):not(.p-button-text):not(.p-button-link):not(.p-button-outlined) {
    color: var(--button-secondary-fg, var(--button-fg));
  }

  &.p-button-outlined {
    text-shadow: 1px -1px 1px color-mix(in srgb, var(--text-color) 76%, transparent);
  }

  &.p-button-text {
    text-shadow: 1px -1px 1px color-mix(in srgb, var(--primary-inverted) 52%, transparent);
    box-shadow: none;
  }
}
</style>
