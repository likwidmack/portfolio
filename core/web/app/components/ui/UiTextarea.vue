<template lang="pug">
PrimeTextarea(
  v-if="isPrimeVue",
  v-bind="$attrs",
  v-model="_model",
  :name="name",
  :input-id="inputId",
  :aria-label="ariaLabel",
  :placeholder="placeholder",
  :rows="rows",
  :disabled="disabled",
  :auto-resize="autoResize",
  fluid
)/
textarea.p-inputtextarea.p-inputtext.p-component(
  v-else,
  v-bind="$attrs",
  :id="inputId",
  :name="name",
  :aria-label="ariaLabel",
  :placeholder="placeholder",
  :rows="rows",
  :disabled="disabled",
  :value="_model ?? undefined",
  @input="_onNativeInput"
)
</template>

<script setup lang="ts">
/** Multi-line text — PrimeVue `Textarea`, else native `<textarea class="p-inputtextarea">`. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();
const _model = defineModel<string | null>({ default: null });

withDefaults(
  defineProps<{
    name?: string;
    inputId?: string;
    ariaLabel?: string;
    placeholder?: string;
    rows?: number;
    autoResize?: boolean;
    disabled?: boolean;
  }>(),
  {
    rows: 4,
    autoResize: false,
    disabled: false,
  }
);

function _onNativeInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }
  _model.value = target.value;
}
</script>
