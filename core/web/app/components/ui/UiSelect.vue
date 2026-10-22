<template lang="pug">
PrimeSelect(
  v-if="isPrimeVue",
  v-bind="_rootAttrs()",
  v-model="_model",
  :options="options",
  :option-label="optionLabel",
  :option-value="optionValue",
  :placeholder="placeholder",
  :input-id="_controlId()",
  :aria-label="ariaLabel",
  :name="name",
  :disabled="disabled",
  :pt="{ option: { styles: { backgroundColor: 'var(--theme-form-background-color)' } } }",
  fluid
)/
select.p-select.p-component.p-inputwrapper(
  v-else,
  v-bind="$attrs",
  :id="_controlId()",
  :name="name",
  :aria-label="ariaLabel",
  :disabled="disabled",
  :value="_nativeModelValue",
  @change="_onNativeChange"
)
  option(v-if="placeholder", value="", disabled) {{ placeholder }}
  option(v-for="item in _nativeOptions", :key="item.key", :value="item.value") {{ item.label }}
</template>

<script setup lang="ts" generic="TValue = unknown">
/** Select — PrimeVue `Select`, else native `<select>` with classic `p-select` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();
const _model = defineModel<TValue | null>({ default: null });
const _attrs = useAttrs();

const props = defineProps<{
  options: unknown[];
  optionLabel?: string;
  optionValue?: string;
  placeholder?: string;
  inputId?: string;
  ariaLabel?: string;
  name?: string;
  disabled?: boolean;
}>();

/** `input-id`, else an `id` attribute — `:id` comes after `$attrs`, so it must carry that id through. */
function _controlId(): string | undefined {
  return props.inputId ?? (typeof _attrs.id === 'string' ? _attrs.id : undefined);
}

/** `$attrs` minus `id`: PrimeVue puts root attrs on its wrapper, and the id belongs on the inner control. */
function _rootAttrs(): Record<string, unknown> {
  return Object.fromEntries(Object.entries(_attrs).filter(([key]) => key !== 'id'));
}

/** PrimeVue's control is a `<span role="combobox">`, which a `label[for]` click cannot focus. */
function _focusFromLabel(event: MouseEvent): void {
  const id = _controlId();
  const label = event.target instanceof Element ? event.target.closest('label') : null;
  if (id && label?.htmlFor === id) {
    document.getElementById(id)?.focus();
  }
}

onMounted(() => {
  if (isPrimeVue) {
    document.addEventListener('click', _focusFromLabel);
  }
});
onBeforeUnmount(() => document.removeEventListener('click', _focusFromLabel));

type NativeOption = { key: string; label: string; value: string; raw: unknown };

function _readField(option: unknown, field: string | undefined): unknown {
  if (!field || option === null || typeof option !== 'object') {
    return option;
  }
  return (option as Record<string, unknown>)[field];
}

const _nativeOptions = computed((): NativeOption[] =>
  props.options.map((option, index) => {
    const label = _readField(option, props.optionLabel);
    const value = props.optionValue ? _readField(option, props.optionValue) : option;
    return {
      key: `${index}-${String(value)}`,
      label: label == null ? String(value ?? '') : String(label),
      value: value == null ? '' : String(value),
      raw: value,
    };
  })
);

const _nativeModelValue = computed(() => {
  if (_model.value == null) {
    return '';
  }
  return String(_model.value);
});

function _onNativeChange(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) {
    return;
  }
  if (target.value === '') {
    _model.value = null;
    return;
  }
  const matched = _nativeOptions.value.find((item) => item.value === target.value);
  _model.value = (matched?.raw ?? target.value) as TValue;
}
</script>
