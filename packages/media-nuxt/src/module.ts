import { addServerScanDir, createResolver, defineNuxtModule } from '@nuxt/kit';

/**
 * Nuxt module: mounts `/api/media/*` handlers and MediaLibrary resolution.
 */
export default defineNuxtModule({
  meta: {
    name: '@tgmc/media-nuxt',
    configKey: 'tgmcMedia',
  },
  setup() {
    const { resolve } = createResolver(import.meta.url);
    // Scan runtime/server so `api/media/*` and `utils/media-library` register like app server dirs.
    addServerScanDir(resolve('../runtime/server'));
  },
});
