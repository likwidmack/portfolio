/**
 * Shared base Nuxt layer for `@tgmc/web`.
 *
 * Leaf layer (does not extend the app). The app root extends this layer.
 * Keep SYS_ENV / Nitro / runtimeConfig in the app root — this layer holds
 * shared shell defaults only.
 */
import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  // Intentionally thin: marketing/app shell defaults live in the root config.
  // Extend this layer when extracting shared components, CSS, or modules.
});
