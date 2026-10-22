<template lang="pug">
PrimePassword(
  v-if="isPrimeVue",
  v-bind="_rootAttrs()",
  v-model="_model",
  :input-id="_controlId()",
  :aria-label="ariaLabel",
  :disabled="disabled",
  :feedback="feedback",
  :toggle-mask="toggleMask",
  fluid
)
input.p-inputtext.p-component.p-password-input(
  v-else,
  v-bind="$attrs",
  :id="_controlId()",
  type="password",
  :disabled="disabled",
  :aria-label="ariaLabel",
  :value="_model ?? undefined",
  autocomplete="current-password",
  @input="_onNativeInput"
)
</template>

<script setup lang="ts">
/** Password field — PrimeVue `Password`, else native `type="password"` with `p-inputtext`. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();
const _model = defineModel<string | null>({ default: null });
const _attrs = useAttrs();

const props = withDefaults(
  defineProps<{
    inputId?: string;
    ariaLabel?: string;
    disabled?: boolean;
    feedback?: boolean;
    toggleMask?: boolean;
  }>(),
  {
    disabled: false,
    ariaLabel: 'Password',
    feedback: false,
    toggleMask: true,
  }
);

/** `input-id`, else an `id` attribute — `:id` comes after `$attrs`, so it must carry that id through. */
function _controlId(): string | undefined {
  return props.inputId ?? (typeof _attrs.id === 'string' ? _attrs.id : undefined);
}

/** `$attrs` minus `id`: PrimeVue puts root attrs on its wrapper, and the id belongs on the inner input. */
function _rootAttrs(): Record<string, unknown> {
  return Object.fromEntries(Object.entries(_attrs).filter(([key]) => key !== 'id'));
}

function _onNativeInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  _model.value = target.value;
}
</script>
