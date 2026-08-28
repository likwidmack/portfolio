<template lang="pug">
PrimeInputNumber(
  v-if="isPrimeVue",
  v-bind="$attrs",
  v-model="_model",
  :input-id="inputId",
  :aria-label="ariaLabel",
  :disabled="disabled",
  :min="min",
  :max="max",
  :step="step",
  :show-buttons="showButtons",
  fluid
)
input.p-inputtext.p-component.p-inputnumber-input(
  v-else,
  v-bind="$attrs",
  :id="inputId",
  type="number",
  :disabled="disabled",
  :min="min",
  :max="max",
  :step="step",
  :value="_model ?? undefined",
  :aria-label="ariaLabel",
  @input="_onNativeInput"
)
</template>

<script setup lang="ts">
/** Numeric input — PrimeVue `InputNumber`, else native number field with classic `p-inputtext` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();
const _model = defineModel<number | null>({ default: null });

withDefaults(
  defineProps<{
    inputId?: string;
    ariaLabel?: string;
    disabled?: boolean;
    min?: number;
    max?: number;
    step?: number;
    showButtons?: boolean;
  }>(),
  {
    disabled: false,
    ariaLabel: 'Number input',
    step: 1,
    showButtons: false,
  }
);

function _onNativeInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  _model.value = raw === '' ? null : Number(raw);
}
</script>
