<template lang="pug">
PrimePanel(v-if="isPrimeVue", v-bind="$attrs", :header="header", :toggleable="toggleable", :collapsed="collapsed")
  slot
section.p-panel.p-component(v-else, v-bind="$attrs")
  .p-panel-header(v-if="header")
    span.p-panel-title {{ header }}
  .p-panel-content-container
    .p-panel-content: slot
</template>

<script setup lang="ts">
/** Content panel — PrimeVue `Panel`, else native section with classic `p-panel` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();

withDefaults(
  defineProps<{
    header?: string;
    toggleable?: boolean;
    collapsed?: boolean;
  }>(),
  {
    toggleable: false,
    collapsed: false,
  }
);
</script>
