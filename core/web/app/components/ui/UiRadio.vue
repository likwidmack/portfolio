<template lang="pug">
PrimeRadioButton(
  v-if="isPrimeVue",
  v-bind="$attrs",
  v-model="_model",
  :input-id="inputId",
  :aria-label="ariaLabel",
  :name="name",
  :value="value",
  :disabled="disabled"
)/
span.p-radiobutton.p-component(v-else, :class="{ 'p-radiobutton-checked': _model === value, 'p-disabled': disabled }")
  input.p-radiobutton-input(
    v-bind="$attrs",
    :id="inputId",
    type="radio",
    :name="name",
    :aria-label="ariaLabel",
    :disabled="disabled",
    :value="_nativeValue",
    :checked="_model === value",
    @change="_onNativeChange"
  )
  span.p-radiobutton-box(aria-hidden="true")
    span.p-radiobutton-icon(v-if="_model === value")
</template>

<script setup lang="ts">
/** Radio — PrimeVue `RadioButton`, else native control with classic `p-radiobutton` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();
const _model = defineModel<string | number | boolean | null>({ default: null });

const props = withDefaults(
  defineProps<{
    inputId?: string;
    ariaLabel?: string;
    name?: string;
    value: string | number | boolean;
    disabled?: boolean;
  }>(),
  {
    ariaLabel: 'Radio option',
    disabled: false,
  }
);

const _nativeValue = computed(() => String(props.value));

function _onNativeChange(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.checked) {
    return;
  }
  _model.value = props.value;
}
</script>
