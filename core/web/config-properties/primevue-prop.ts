/**
 * PrimeVue Nuxt module options — styled mode with `@tgmc/theme` custom preset.
 *
 * - `themePrimeVuePreset`: Nora remapped onto global CSS variables (primary / accent /
 *   surfaces). Accent active color follows `--theme-accent-color` (complementary of primary).
 * - `themePrimeVueCssLayer`: cascade order matching theme SCSS layers
 */
import { createPrimeVueNuxtConfig, themePrimeVueCssLayer, themePrimeVuePreset } from '@tgmc/theme/primevue';

/** Returns the `@primevue/nuxt-module` configuration object merged into `defineNuxtConfig`. */
export const primevue = () =>
  createPrimeVueNuxtConfig({
    unstyled: false,
    preset: themePrimeVuePreset,
    cssLayer: { ...themePrimeVueCssLayer },
    components: ['Toast'],
  });

export default primevue;
