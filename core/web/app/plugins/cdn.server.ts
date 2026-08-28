/**
 * CDN Plugin (Server)
 *
 * Server-side plugin that injects CDN configuration into the Nuxt app.
 * Provides $cdn object accessible in server routes and middleware.
 */

import { createCdnHelper } from '#shared/utils/cdn';

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const cdnUrl = config.public.cdnUrl as string | undefined;

  // Create CDN helper instance
  const cdnHelper = createCdnHelper(cdnUrl);

  // Inject $cdn into Nuxt app
  return {
    provide: {
      cdn: {
        url: cdnHelper.url,
        enabled: cdnHelper.isEnabled,
        resolve: cdnHelper.resolve,
        resolvePaths: cdnHelper.resolvePaths,
        config: cdnHelper.config,
      },
    },
  };
});
