<template lang="pug">
span.p-radiobutton.p-component(
  :class="{ 'p-radiobutton-checked': selected, 'p-disabled': disabled }",
  @click="select"
)
  input.p-radiobutton-input(
    v-bind="$attrs",
    :id="inputId",
    type="radio",
    :name="name",
    :aria-label="ariaLabel",
    :disabled="disabled",
    :value="nativeValue",
    :checked="selected",
    @change="select",
    @click.stop="select"
  )
  span.p-radiobutton-box(aria-hidden="true")
    span.p-radiobutton-icon(v-if="selected")
</template>

<script setup lang="ts">
/**
 * Radio — native control with classic `p-radiobutton` classes.
 *
 * Model updates are explicit (`select`) from the box, input click, and change.
 * Avoid Vue's built-in radio `v-model` across separate component instances — it
 * fought Cypress / parent `:model-value` and left Personalize Grid unchecked.
 */
defineOptions({ inheritAttrs: false });

const model = defineModel<string | number | boolean | null>({ default: null });

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

const nativeValue = computed(() => String(props.value));
const selected = computed(() => model.value === props.value);

function select(): void {
  if (props.disabled) return;
  model.value = props.value;
}
</script>
