<template lang="pug">
PrimeDivider(v-if="isPrimeVue", v-bind="$attrs", :layout="layout", :align="align", :type="type")
  slot
.p-divider.p-component(
  v-else,
  v-bind="$attrs",
  :class="_nativeClass",
  role="separator",
  :aria-orientation="layout === 'vertical' ? 'vertical' : 'horizontal'"
)
  .p-divider-content(v-if="$slots.default"): slot
</template>

<script setup lang="ts">
/** Content divider — PrimeVue `Divider`, else native separator with classic `p-divider` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();

const props = withDefaults(
  defineProps<{
    layout?: 'horizontal' | 'vertical';
    align?: 'left' | 'center' | 'right' | 'top' | 'bottom';
    type?: 'solid' | 'dashed' | 'dotted';
  }>(),
  {
    layout: 'horizontal',
    type: 'solid',
  }
);

const _nativeClass = computed(() => [
  props.layout === 'vertical' ? 'p-divider-vertical' : 'p-divider-horizontal',
  props.type ? `p-divider-${props.type}` : undefined,
]);
</script>
