<template lang="pug">
PrimeDatePicker(
  v-if="isPrimeVue",
  v-bind="$attrs",
  v-model="_model",
  :input-id="inputId",
  :aria-label="ariaLabel",
  :disabled="disabled",
  :show-icon="showIcon",
  :date-format="dateFormat",
  fluid
)
input.p-inputtext.p-component(
  v-else,
  v-bind="$attrs",
  :id="inputId",
  type="date",
  :disabled="disabled",
  :aria-label="ariaLabel",
  :value="_toNativeDate(_model)",
  @input="_onNativeInput"
)
</template>

<script setup lang="ts">
/** Date picker — PrimeVue `DatePicker`, else native `type="date"` with classic `p-inputtext` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();
const _model = defineModel<Date | string | null>({ default: null });

withDefaults(
  defineProps<{
    inputId?: string;
    ariaLabel?: string;
    disabled?: boolean;
    showIcon?: boolean;
    dateFormat?: string;
  }>(),
  {
    disabled: false,
    ariaLabel: 'Date',
    showIcon: true,
    dateFormat: 'yy-mm-dd',
  }
);

function _toNativeDate(value: Date | string | null): string {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function _fromNativeDate(value: string): void {
  _model.value = value ? value : null;
}

function _onNativeInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  _fromNativeDate(target.value);
}
</script>
