<template lang="pug">
PrimeTag(v-if="isPrimeVue", v-bind="$attrs", :value="value", :severity="severity", :icon="icon", :rounded="rounded")
  slot
span.p-tag.p-component(v-else, v-bind="$attrs", :class="_nativeClass")
  i.p-tag-icon(v-if="icon", :class="icon", aria-hidden="true")
  span.p-tag-label(v-if="value") {{ value }}
  slot
</template>

<script setup lang="ts">
/** Compact tag / label — PrimeVue `Tag`, else native span with classic `p-tag` classes. */
defineOptions({
  inheritAttrs: false,
});

const { isPrimeVue } = useUiStack();

const props = defineProps<{
  value?: string;
  severity?: 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast';
  icon?: string;
  rounded?: boolean;
}>();

const _nativeClass = computed(() => {
  const classes: string[] = [];
  if (props.severity) {
    classes.push(`p-tag-${props.severity}`);
  }
  if (props.rounded) {
    classes.push('p-tag-rounded');
  }
  return classes;
});
</script>
