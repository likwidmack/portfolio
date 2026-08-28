<template lang="pug">
UiDialog(v-model:visible="open", header="Personalize", aria-label="Personalize this portfolio")
  .personalize
    fieldset
      legend Color mode
      label(v-for="option in modes", :key="option.value")
        input(
          type="radio",
          name="theme-mode",
          :value="option.value",
          :checked="mode === option.value",
          @change="setMode(option.value)"
        )
        span {{ option.label }}

    fieldset
      legend Accent
      label.personalize__accent(v-for="option in accents", :key="option.id")
        input(
          type="radio",
          name="theme-accent",
          :value="option.id",
          :checked="accent === option.id",
          @change="setAccent(option.id)"
        )
        span(:style="{ '--swatch': option.color }") {{ option.label }}

    fieldset
      legend Motion
      label(v-for="option in motions", :key="option.value")
        input(
          type="radio",
          name="theme-motion",
          :value="option.value",
          :checked="motion === option.value",
          @change="setMotion(option.value)"
        )
        span {{ option.label }}

  template(#footer)
    UiButton(label="Reset preferences", variant="outlined", severity="secondary", @click="reset")
    UiButton(label="Done", @click="open = false")
</template>

<script setup lang="ts">
import type { MotionPreference } from '#shared/personalization';
import type { ThemeModePreference } from '@tgmc/theme/tokens';

const open = defineModel<boolean>('open', { default: false });
const { mode, accent, motion, accents, setMode, setAccent, setMotion, reset } = usePersonalization();
const modes: Array<{ label: string; value: ThemeModePreference }> = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];
const motions: Array<{ label: string; value: MotionPreference }> = [
  { label: 'System', value: 'system' },
  { label: 'Playful', value: 'playful' },
  { label: 'Reduced', value: 'reduced' },
];
</script>
