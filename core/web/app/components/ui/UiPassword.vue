<template lang="pug">
PrimePassword(
  v-if="isPrimeVue",
  v-bind="$attrs",
  v-model="_model",
  :input-id="inputId",
  :aria-label="ariaLabel",
  :disabled="disabled",
  :feedback="feedback",
  :toggle-mask="toggleMask",
  fluid
)
input.p-inputtext.p-component.p-password-input(
  v-else,
  v-bind="$attrs",
  :id="inputId",
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

withDefaults(
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

function _onNativeInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  _model.value = target.value;
}
</script>
