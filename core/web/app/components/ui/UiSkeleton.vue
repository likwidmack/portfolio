<template lang="pug">
PrimeSkeleton(v-if="isPrimeVue", v-bind="$attrs", :width="width", :height="height", :shape="shape")
span.p-skeleton.p-component(
  v-else,
  v-bind="$attrs",
  :class="shape === 'circle' ? 'p-skeleton-circle' : undefined",
  :style="{ width, height }",
  aria-hidden="true"
)
</template>

<script setup lang="ts">
/** Loading placeholder — PrimeVue `Skeleton`, else native block with classic `p-skeleton` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();

withDefaults(
  defineProps<{
    width?: string;
    height?: string;
    shape?: 'rectangle' | 'circle';
  }>(),
  {
    width: '100%',
    height: '1rem',
    shape: 'rectangle',
  }
);
</script>
