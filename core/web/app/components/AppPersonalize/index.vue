<template lang="pug">
UiDialog(v-model:visible="open", header="Personalize", aria-label="Personalize this portfolio")
  .personalize
    .grid-x.grid-margin-x.personalize__section(data-algo="cluster")
      .cell.small-12
        h3.personalize__legend Color mode
      .cell.small-12.medium-auto(v-for="option in modes", :key="option.value")
        label.personalize__option
          UiRadio(
            v-model="modeModel",
            name="theme-mode",
            :value="option.value",
            :input-id="`theme-mode-${option.value}`",
            :aria-label="option.label"
          )
          span {{ option.label }}

    .personalize__section
      AppBackgroundPicker(v-model="backgroundModel", v-model:custom="backgroundCustomModel", name="theme-background")

    .grid-x.grid-margin-x.personalize__section
      .cell.small-12
        h3.personalize__legend Quick apply
        p.personalize__hint Choose a saved setup or brand pack. Deep editing lives in Style Studio.

      .cell.small-12(v-if="styleSetups.length")
        label.personalize__field-label(for="style-setup") Setup
        UiSelect(
          v-model="setupModel",
          input-id="style-setup",
          name="style-setup",
          aria-label="Named style setup",
          :options="setupOptions",
          option-label="label",
          option-value="id",
          placeholder="Choose a setup"
        )

      .cell.small-12
        label.personalize__field-label(for="brand-pack") Brand pack
        UiSelect(
          v-model="packModel",
          input-id="brand-pack",
          name="brand-pack",
          aria-label="Brand color pack",
          :options="brandPacks",
          option-label="label",
          option-value="id",
          placeholder="Choose a pack"
        )

  template(#footer)
    UiButton(label="Open studio", severity="secondary", variant="outlined", @click="openStudio")
    UiButton(label="Reset preferences", variant="outlined", severity="secondary", @click="reset")
    UiButton(label="Done", @click.stop="closeDialog")
</template>

<script setup lang="ts">
/**
 * Personalize dialog — color mode, depth-field background (shared AppBackgroundPicker with camera consent),
 * setup/pack quick-apply, link to Style Studio.
 * Brand role editors and motion live on `/styles` (Style Studio).
 */
import type { BackgroundMode, BrandPackId } from '#shared/personalization';
import { Color } from '@tgmc/theme';
import type { ThemeModePreference } from '@tgmc/theme/tokens';

const open = defineModel<boolean>('open', { default: false });
const {
  mode,
  background,
  backgroundCustom,
  brandPacks,
  styleSetups,
  activeSetupId,
  setMode,
  setBackground,
  setBackgroundCustom,
  applyBrandPack,
  applySetup,
  reset,
} = usePersonalization();

const modes: Array<{ label: string; value: ThemeModePreference }> = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const modeModel = computed({
  get: () => mode.value,
  set: (value: ThemeModePreference) => setMode(value),
});

const backgroundModel = computed({
  get: () => background.value,
  set: (value: BackgroundMode) => setBackground(value),
});

const backgroundCustomModel = computed({
  get: () => backgroundCustom.value,
  set: (value: string) => onCustomBackground(value),
});

const setupOptions = computed(() => styleSetups.value.map((setup) => ({ id: setup.id, label: setup.name })));

const setupModel = computed({
  get: () => activeSetupId.value,
  set: (value: string | null) => {
    if (!value) return;
    const setup = styleSetups.value.find((item) => item.id === value);
    if (setup) applySetup(setup);
  },
});

const packModel = computed({
  get: () => null as BrandPackId | null,
  set: (value: BrandPackId | null) => {
    if (value) applyBrandPack(value);
  },
});

function onCustomBackground(value: string | number | null | undefined): void {
  if (value == null || value === '') return;
  const raw = String(value).trim();
  if (!Color.isValid(raw) && !Color.isValid(`#${raw}`)) return;
  const hex = Color.toHex(raw.startsWith('#') ? raw : `#${raw}`);
  setBackgroundCustom(hex);
}

/** Defer unmount so the closing click cannot fall through onto phone chrome (Menu). */
function closeDialog(): void {
  void nextTick(() => {
    open.value = false;
  });
}

function openStudio(): void {
  open.value = false;
  void navigateTo('/styles');
}
</script>

<style lang="scss" src="./AppPersonalize.scss" scoped></style>
