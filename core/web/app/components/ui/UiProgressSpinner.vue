<template lang="pug">
PrimeProgressSpinner(v-if="isPrimeVue", v-bind="$attrs", :stroke-width="strokeWidth", :aria-label="ariaLabel")
span.p-progressspinner(v-else, v-bind="$attrs", role="status", :aria-label="ariaLabel")
  svg.p-progressspinner-spin(viewBox="25 25 50 50", aria-hidden="true")
    circle.p-progressspinner-circle(
      cx="50",
      cy="50",
      r="20",
      fill="none",
      :stroke-width="strokeWidth",
      stroke-miterlimit="10"
    )
</template>

<script setup lang="ts">
/** Loading spinner — PrimeVue `ProgressSpinner`, else SVG with classic `p-progressspinner` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();

withDefaults(
  defineProps<{
    strokeWidth?: string;
    ariaLabel?: string;
  }>(),
  {
    strokeWidth: '4',
    ariaLabel: 'Loading',
  }
);
</script>
