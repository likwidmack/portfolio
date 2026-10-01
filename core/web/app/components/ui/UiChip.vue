<template lang="pug">
PrimeChip(v-if="isPrimeVue", v-bind="$attrs", :label="label", :removable="removable", @remove="emit('remove', $event)")
  template(v-if="icon", #icon)
    UiIcon.p-chip-icon(:name="icon")
span.p-chip.p-component(v-else, v-bind="$attrs")
  UiIcon.p-chip-icon(v-if="icon", :name="icon")
  span.p-chip-label {{ label }}
  button.p-chip-remove-icon(
    v-if="removable",
    type="button",
    :aria-label="`Remove ${label ?? ''}`.trim()",
    @click="emit('remove', $event)"
  )
    UiIcon(name="x")
</template>

<script setup lang="ts">
/** Compact chip / pill — PrimeVue `Chip`, else native span with classic `p-chip` classes. `icon` is a Lucide name. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();

defineProps<{
  label?: string;
  icon?: string;
  removable?: boolean;
}>();

const emit = defineEmits<{
  remove: [event: Event];
}>();
</script>
