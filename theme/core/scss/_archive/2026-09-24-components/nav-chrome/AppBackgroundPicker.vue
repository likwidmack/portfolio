<template lang="pug">
fieldset.background-picker
  legend.background-picker__legend Background
  .background-picker__options
    label.background-picker__option(v-for="option in backgroundOptions", :key="option.value")
      UiRadio(
        :model-value="pending ?? model",
        :name="name",
        :value="option.value",
        :input-id="`${name}-${option.value}`",
        :aria-label="option.label",
        @update:model-value="onPick"
      )
      span {{ option.label }}
  .background-picker__camera(v-if="pending === 'camera'", role="note")
    p Uses your camera locally — nothing is recorded or sent.
    .button-row
      UiButton(label="Turn on camera", type="button", size="small", @click="confirmCamera")
      UiButton(
        label="Cancel",
        type="button",
        size="small",
        severity="secondary",
        variant="outlined",
        @click="pending = null"
      )
  .background-picker__custom(v-if="model === 'custom'")
    UiColorPicker(
      :model-value="custom",
      :input-id="`${name}-custom-picker`",
      aria-label="Custom background colour",
      @update:model-value="onCustom"
    )
    UiInputText(
      :model-value="custom",
      :input-id="`${name}-custom-hex`",
      aria-label="Custom background hex",
      placeholder="#rrggbb",
      @update:model-value="onCustom"
    )
</template>

<script setup lang="ts">
/**
 * Background mode picker shared by Personalize and Style Studio.
 * Camera needs consent first: picking it shows what happens, and the mode only
 * switches (and the browser permission prompt only appears) after "Turn on camera".
 */
import { BACKGROUND_MODES, type BackgroundMode } from '#shared/personalization';

defineProps<{ name: string }>();

const backgroundOptions = BACKGROUND_MODES;

const model = defineModel<BackgroundMode>({ required: true });
const custom = defineModel<string>('custom', { default: '' });
const pending = ref<BackgroundMode | null>(null);

function onPick(value: unknown): void {
  const next = value as BackgroundMode;
  if (next === 'camera' && model.value !== 'camera') {
    pending.value = 'camera';
    return;
  }
  pending.value = null;
  model.value = next;
}

function confirmCamera(): void {
  pending.value = null;
  model.value = 'camera';
}

function onCustom(value: unknown): void {
  if (value == null || value === '') return;
  custom.value = String(value);
}
</script>

<style lang="scss" scoped>
.background-picker {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;

  &__legend {
    margin-bottom: var(--space-2);
    padding: 0;
    font-weight: 600;
  }

  &__options {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  &__option {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 44px;
    cursor: pointer;
  }

  &__camera {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--border-strong);
    border-radius: var(--border-radius-md);

    p {
      margin: 0;
    }
  }

  &__custom {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }
}
</style>
