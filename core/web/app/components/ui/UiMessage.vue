<template lang="pug">
PrimeMessage(v-if="isPrimeVue", v-bind="$attrs", :severity="severity", :closable="closable", :life="life", :icon="icon")
  slot
.p-message.p-component(
  v-else,
  v-bind="$attrs",
  :class="severity ? `p-message-${severity}` : 'p-message-info'",
  role="status"
)
  .p-message-content-wrapper
    .p-message-content
      slot
</template>

<script setup lang="ts">
/** Status / alert banner — PrimeVue `Message`, else native region with classic `p-message` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();

withDefaults(
  defineProps<{
    severity?: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast';
    closable?: boolean;
    life?: number;
    icon?: string;
  }>(),
  {
    closable: false,
  }
);
</script>
