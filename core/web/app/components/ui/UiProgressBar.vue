<template lang="pug">
PrimeProgressBar(
  v-if="isPrimeVue",
  v-bind="$attrs",
  :value="value",
  :show-value="showValue",
  :mode="mode",
  :aria-label="ariaLabel"
)
.p-progressbar.p-component(
  v-else,
  v-bind="$attrs",
  role="progressbar",
  :aria-valuenow="mode === 'indeterminate' ? undefined : value",
  :aria-valuemin="0",
  :aria-valuemax="100",
  :aria-label="ariaLabel",
  :class="mode === 'indeterminate' ? 'p-progressbar-indeterminate' : undefined"
)
  .p-progressbar-value(:style="mode === 'indeterminate' ? undefined : { width: `${value ?? 0}%` }")
    .p-progressbar-label(v-if="showValue && mode !== 'indeterminate'") {{ value }}%
</template>

<script setup lang="ts">
/** Progress indicator — PrimeVue `ProgressBar`, else native bar with classic `p-progressbar` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();

withDefaults(
  defineProps<{
    value?: number;
    showValue?: boolean;
    mode?: 'determinate' | 'indeterminate';
    ariaLabel?: string;
  }>(),
  {
    value: 0,
    showValue: true,
    mode: 'determinate',
    ariaLabel: 'Progress',
  }
);
</script>
