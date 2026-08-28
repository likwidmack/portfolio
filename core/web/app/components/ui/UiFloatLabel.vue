<template lang="pug">
PrimeFloatLabel(v-if="isPrimeVue", v-bind="$attrs")
  slot
  label(v-if="label", :for="forId") {{ label }}
span.p-floatlabel(v-else, v-bind="$attrs")
  slot
  label(v-if="label", :for="forId") {{ label }}
</template>

<script setup lang="ts">
/** Floating label wrapper — PrimeVue `FloatLabel`, else native span with classic `p-floatlabel` class. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();

defineProps<{
  label?: string;
  forId?: string;
}>();
</script>
