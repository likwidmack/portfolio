<template lang="pug">
PrimeColorPicker(
  v-if="isPrimeVue",
  v-bind="$attrs",
  :model-value="_primeModel",
  :input-id="inputId",
  :pt="{ preview: { 'aria-label': ariaLabel } }",
  :disabled="disabled",
  format="hex",
  default-color="ffffff",
  @update:model-value="_onPrimeUpdate"
)
input.p-inputtext.p-component(
  v-else,
  v-bind="$attrs",
  :id="inputId",
  type="color",
  :disabled="disabled",
  :aria-label="ariaLabel",
  :value="_nativeHex",
  @input="_onNativeInput"
)
</template>

<script setup lang="ts">
/**
 * Color picker — PrimeVue `ColorPicker` when the PrimeVue stack is active,
 * else native `type="color"` (Foundation / native stacks).
 * Parent `v-model` is always `#rrggbb` hex.
 */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();
const _model = defineModel<string | null>({ default: null });

withDefaults(
  defineProps<{
    inputId?: string;
    ariaLabel?: string;
    disabled?: boolean;
  }>(),
  {
    disabled: false,
    ariaLabel: 'Color',
  }
);

function _toHashHex(value: string | null | undefined): string {
  if (!value) return '#000000';
  const raw = value.startsWith('#') ? value.slice(1) : value;
  return `#${raw.slice(0, 6).toLowerCase()}`;
}

function _toPrimeHex(value: string | null | undefined): string {
  return _toHashHex(value).slice(1);
}

const _primeModel = computed(() => _toPrimeHex(_model.value));
const _nativeHex = computed(() => _toHashHex(_model.value));

function _onPrimeUpdate(value: string | null | undefined): void {
  _model.value = value ? _toHashHex(value) : null;
}

function _onNativeInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  _model.value = _toHashHex(target.value);
}
</script>
