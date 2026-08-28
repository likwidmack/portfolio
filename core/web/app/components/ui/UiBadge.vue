<template lang="pug">
PrimeBadge(v-if="isPrimeVue", v-bind="$attrs", :value="value", :severity="severity", :size="size")
span.p-badge.p-component(v-else, v-bind="$attrs", :class="_nativeClass") {{ value }}
</template>

<script setup lang="ts">
/** Compact count / status badge — PrimeVue `Badge`, else native span with classic `p-badge` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();

const props = defineProps<{
  value?: string | number;
  severity?: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
  size?: 'small' | 'large' | 'xlarge';
}>();

const _nativeClass = computed(() => {
  const classes: string[] = [];
  if (props.severity) {
    classes.push(`p-badge-${props.severity}`);
  }
  if (props.size === 'large' || props.size === 'xlarge') {
    classes.push('p-badge-lg');
  }
  return classes;
});
</script>
