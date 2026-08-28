<template lang="pug">
PrimeChip(
  v-if="isPrimeVue",
  v-bind="$attrs",
  :label="label",
  :icon="icon",
  :removable="removable",
  @remove="emit('remove', $event)"
)
span.p-chip.p-component(v-else, v-bind="$attrs")
  i.p-chip-icon(v-if="icon", :class="icon", aria-hidden="true")
  span.p-chip-label {{ label }}
  button.p-chip-remove-icon(v-if="removable", type="button", aria-label="Remove", @click="emit('remove', $event)") ×
</template>

<script setup lang="ts">
/** Compact chip / pill — PrimeVue `Chip`, else native span with classic `p-chip` classes. */
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
