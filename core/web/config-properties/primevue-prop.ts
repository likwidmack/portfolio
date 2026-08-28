/**
 * PrimeVue Nuxt module options — styled mode with `@tgmc/theme` custom preset.
 *
 * - `themePrimeVuePreset`: Nora remapped onto global CSS variables
 * - `themePrimeVueCssLayer`: cascade order matching theme SCSS layers
 * - Classic `p-*` PassThrough only when `unstyled: true` (Sass `@layer primevue` path)
 */
import { createPrimeVueNuxtConfig, themePrimeVueCssLayer, themePrimeVuePreset } from '@tgmc/theme/primevue';
import { classicPrimeVuePt } from './primevue/classic-pt';

/** Returns the `@primevue/nuxt-module` configuration object merged into `defineNuxtConfig`. */
export const primevue = () => {
  const config = createPrimeVueNuxtConfig({
    unstyled: false,
    preset: themePrimeVuePreset,
    cssLayer: { ...themePrimeVueCssLayer },
    components: ['Toast'],
  });

  const options = { ...(config.options as Record<string, unknown>) };

  if (options.unstyled) {
    options.pt = classicPrimeVuePt;
  }

  return {
    ...config,
    options,
  };
};

export default primevue;
