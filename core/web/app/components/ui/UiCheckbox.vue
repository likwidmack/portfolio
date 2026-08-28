<template lang="pug">
PrimeCheckbox(
  v-if="isPrimeVue",
  v-bind="$attrs",
  v-model="_model",
  :binary="binary",
  :input-id="inputId",
  :aria-label="ariaLabel",
  :name="name",
  :value="value",
  :disabled="disabled"
)/
span.p-checkbox.p-component(v-else, :class="{ 'p-checkbox-checked': _nativeChecked, 'p-disabled': disabled }")
  input.p-checkbox-input(
    v-bind="$attrs",
    :id="inputId",
    type="checkbox",
    :name="name",
    :aria-label="ariaLabel",
    :disabled="disabled",
    :value="_nativeValue",
    :checked="_nativeChecked",
    @change="_onNativeChange"
  )
  span.p-checkbox-box(aria-hidden="true")
    span.p-checkbox-icon(v-if="_nativeChecked") ✓
</template>

<script setup lang="ts">
/** Checkbox — PrimeVue `Checkbox`, else native control with classic `p-checkbox` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();
const _model = defineModel<boolean | string | number | null | Array<string | number | boolean>>({ default: null });

const props = withDefaults(
  defineProps<{
    binary?: boolean;
    inputId?: string;
    ariaLabel?: string;
    name?: string;
    value?: string | number | boolean;
    disabled?: boolean;
  }>(),
  {
    binary: true,
    ariaLabel: 'Checkbox',
    disabled: false,
  }
);

const _nativeValue = computed(() => {
  if (props.value === undefined || props.value === null) {
    return undefined;
  }
  return String(props.value);
});

const _nativeChecked = computed(() => {
  if (props.binary) {
    return Boolean(_model.value);
  }
  const selected = _model.value;
  if (Array.isArray(selected)) {
    return selected.includes(props.value as string | number | boolean);
  }
  return selected === props.value;
});

function _onNativeChange(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (props.binary) {
    _model.value = target.checked;
    return;
  }

  const option = props.value;
  if (option === undefined) {
    return;
  }

  const current = _model.value;
  if (Array.isArray(current)) {
    _model.value = target.checked ? [...current, option] : current.filter((item) => item !== option);
    return;
  }

  _model.value = target.checked ? option : null;
}
</script>
