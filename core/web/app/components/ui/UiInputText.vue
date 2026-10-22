<template lang="pug">
PrimeInputText(
  v-if="isPrimeVue",
  v-bind="$attrs",
  :id="_controlId()",
  v-model="_model",
  :type="type",
  :name="name",
  :aria-label="ariaLabel",
  :placeholder="placeholder",
  :disabled="disabled",
  fluid
)/
input.p-inputtext.p-component(
  v-else,
  v-bind="$attrs",
  :id="_controlId()",
  :type="type",
  :name="name",
  :aria-label="ariaLabel",
  :placeholder="placeholder",
  :disabled="disabled",
  :value="_model ?? undefined",
  @input="_onNativeInput"
)
</template>

<script setup lang="ts">
/** Text input — PrimeVue `InputText`, else native `<input class="p-inputtext">`. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();
const _model = defineModel<string | number | null>({ default: null });
const _attrs = useAttrs();

const props = withDefaults(
  defineProps<{
    type?: string;
    name?: string;
    inputId?: string;
    ariaLabel?: string;
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    type: 'text',
    disabled: false,
  }
);

/** `input-id`, else an `id` attribute — `:id` comes after `$attrs`, so it must carry that id through. */
function _controlId(): string | undefined {
  return props.inputId ?? (typeof _attrs.id === 'string' ? _attrs.id : undefined);
}

function _onNativeInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  _model.value = target.value;
}
</script>
