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
    label.background-picker__field(v-for="option in customOptions", :key="option.id")
      span {{ option.label }}
      UiColorPicker(
        v-if="option.kind === 'color'",
        :model-value="colorValue(option.variable)",
        :input-id="`${name}-bg-${option.id}`",
        :aria-label="`Background ${option.label}`",
        @update:model-value="onOption(option.variable, $event)"
      )
      UiInputText(
        v-else-if="option.kind === 'text'",
        :model-value="textValue(option.variable)",
        :input-id="`${name}-bg-${option.id}`",
        :aria-label="`Background ${option.label}`",
        placeholder="Theme default",
        @update:model-value="onOption(option.variable, $event)"
      )
      UiSelect(
        v-else-if="option.kind === 'choice'",
        :model-value="textValue(option.variable)",
        :input-id="`${name}-bg-${option.id}`",
        :aria-label="`Background ${option.label}`",
        :options="choiceOptions(choicesFor(option))",
        option-label="label",
        option-value="value",
        placeholder="Theme default",
        @update:model-value="onOption(option.variable, $event)"
      )
</template>

<script setup lang="ts">
/**
 * Background mode picker shared by Personalize and Style Studio.
 * Camera needs consent first: picking it shows what happens, and the mode only
 * switches (and the browser permission prompt only appears) after "Turn on camera".
 */
import {
  BACKGROUND_CUSTOM_OPTIONS,
  BACKGROUND_MODES,
  buildPresetBackgroundTokens,
  type BackgroundMode,
} from '#shared/personalization';
import { resolveCssColorToHex } from '#shared/utils/resolve-css-color';

defineProps<{ name: string }>();

const backgroundOptions = BACKGROUND_MODES;
const customOptions = BACKGROUND_CUSTOM_OPTIONS;
const optionValues = ref<Record<string, string>>({});

const model = defineModel<BackgroundMode>({ required: true });
const custom = defineModel<string>('custom', { default: '' });
const pending = ref<BackgroundMode | null>(null);
const { accent, brandRoles } = usePersonalization();

watch(
  [accent, model],
  () => {
    if (model.value !== 'custom' || !accent.value) return;
    const tokens = buildPresetBackgroundTokens(accent.value, brandRoles.value, 'dark');
    if (!tokens['--portfolio-background-image']) return;
    const next = { ...optionValues.value };
    for (const option of BACKGROUND_CUSTOM_OPTIONS) {
      const value = tokens[option.variable];
      if (value) next[option.variable] = value;
    }
    optionValues.value = next;
  },
  { immediate: true }
);

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

function colorValue(variable: string): string {
  return optionValues.value[variable] || resolveCssColorToHex(`var(${variable})`) || '';
}

function textValue(variable: string): string {
  return optionValues.value[variable] ?? '';
}

function choicesFor(option: (typeof BACKGROUND_CUSTOM_OPTIONS)[number]): readonly string[] {
  switch (option.kind) {
    case 'choice':
      return option.choices;
    case 'color':
    case 'text':
      return [];
    default: {
      const _exhaustive: never = option;
      return _exhaustive;
    }
  }
}
function choiceOptions(choices: readonly string[]): Array<{ label: string; value: string }> {
  return [{ label: 'Theme default', value: '' }, ...choices.map((value) => ({ label: value, value }))];
}

function onOption(variable: string, value: unknown): void {
  const next = value == null ? '' : String(value);
  optionValues.value = { ...optionValues.value, [variable]: next };
  if (!import.meta.client) return;
  const root = document.documentElement;
  if (next) root.style.setProperty(variable, next);
  else root.style.removeProperty(variable);
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
    min-height: var(--touch-target, 44px);
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
    display: grid;
    gap: var(--space-2);
  }

  &__field {
    display: grid;
    gap: var(--space-1);
    min-height: var(--touch-target, 44px);
  }
}
</style>
