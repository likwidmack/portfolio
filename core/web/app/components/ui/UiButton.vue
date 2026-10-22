<template lang="pug">
PrimeButton(
  v-if="isPrimeVue",
  v-bind="$attrs",
  :label="label",
  :aria-label="ariaLabel",
  :severity="severity",
  :variant="variant",
  :type="type",
  :disabled="disabled"
)
  template(v-if="icon", #icon="iconProps")
    UiIcon(:name="icon", :class="iconProps.class")
  slot
button.p-button.p-component(
  v-else,
  v-bind="$attrs",
  :type="type",
  :disabled="disabled",
  :aria-label="ariaLabel ?? label",
  :class="_nativeClass"
)
  UiIcon.p-button-icon(v-if="icon", :name="icon")
  span.p-button-label(v-if="label") {{ label }}
  slot
</template>

<script setup lang="ts">
/**
 * Button — PrimeVue `Button`, else native control with classic `p-button` classes (theme `@layer primevue`).
 * `icon` is a Lucide name (`UiIcon`, e.g. `external-link`); icon-only buttons need `ariaLabel`.
 */
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
  border-radius: var(--button-radius, 2px);
  font-family: var(--font-family-mono);
  // The theme floors (`--type-min`, `--touch-target`): rem-based, so they grow with the reader's
  // text size, with a px floor if they shrink it.
  font-size: var(--type-min, max(0.75rem, 12px));
  min-height: var(--touch-target, 44px); // touch target (WCAG 2.5.5 / repo UI rule)
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
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
    color: var(--theme-text-secondary-color, var(--theme-button-fg-color));

    &:hover,
    &:focus,
    &:active {
      text-decoration: none;
    }
  }

  // Theme `focus-ring-shadow`: the 3px glow (the same ring as native buttons) plus a transparent
  // outline that forced-colors mode repaints, since it drops the glow.
  &:focus-visible,
  &:focus {
    @include focus-ring-shadow(
      0 0 0 3px var(--theme-focus-ring-color),
      var(--button-shadow-hover, var(--button-shadow))
    );
  }

  // Filled status buttons take the theme's status text (the mode paper), not the primary ink.
  &:not([disabled]):not(.p-button-text):not(.p-button-link):not(.p-button-outlined):not(.p-button-success):not(
      .p-button-warn
    ):not(.p-button-warning):not(.p-button-danger):not(.p-button-info) {
    color: var(--theme-button-secondary-fg-color, var(--theme-button-fg-color));
  }

  // Outlined status buttons keep the theme's status ink / hue (`pv-outline-tone`); the rest hover in
  // the primary ink (≥ 4.5:1 on the theme's hover wash) — not a palette mix that is not checked.
  &.p-button-outlined:not(.p-button-success):not(.p-button-warn):not(.p-button-warning):not(.p-button-danger):not(
      .p-button-info
    ) {
    text-shadow: 1px -1px 1px color-mix(in srgb, var(--theme-text-color) 76%, transparent);

    &:hover,
    &:focus-visible {
      border-color: var(--portfolio-rose-color, var(--theme-primary-color));
      color: var(--theme-primary-ink-color);
    }
  }

  &.p-button-text {
    text-shadow: 1px -1px 1px color-mix(in srgb, var(--theme-primary-inverted-color) 52%, transparent);
    box-shadow: none;
  }
}
</style>
