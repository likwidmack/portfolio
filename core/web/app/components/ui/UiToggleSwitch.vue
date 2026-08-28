<template lang="pug">
PrimeToggleSwitch(
  v-if="isPrimeVue",
  v-bind="$attrs",
  v-model="_model",
  :input-id="inputId",
  :disabled="disabled",
  :aria-label="ariaLabel"
)
span.p-toggleswitch.p-component(v-else, :class="{ 'p-toggleswitch-checked': !!_model, 'p-disabled': disabled }")
  input.p-toggleswitch-input(
    v-bind="$attrs",
    :id="inputId",
    type="checkbox",
    role="switch",
    :checked="!!_model",
    :disabled="disabled",
    :aria-label="ariaLabel",
    @change="_onNativeChange"
  )
  span.p-toggleswitch-slider(aria-hidden="true")
    span.p-toggleswitch-handle
</template>

<script setup lang="ts">
/** Boolean switch — PrimeVue `ToggleSwitch`, else native control with classic `p-toggleswitch` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();
const _model = defineModel<boolean>({ default: false });

withDefaults(
  defineProps<{
    inputId?: string;
    disabled?: boolean;
    ariaLabel?: string;
  }>(),
  {
    disabled: false,
    ariaLabel: 'Toggle switch',
  }
);

function _onNativeChange(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  _model.value = target.checked;
}
</script>
