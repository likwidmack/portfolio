/**
 * Composable: useCdn
 *
 * Thin runtime-config wrapper around shared CDN helpers.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { cdnUrl, resolvePath, isEnabled } = useCdn();
 * const imageUrl = resolvePath('/images/hero.webp');
 * </script>
 * ```
 */
import { createCdnHelper } from '#shared/utils/cdn';

export const useCdn = () => {
  const cdnUrl = useRuntimeConfig().public.cdnUrl as string | undefined;
  const helper = createCdnHelper(cdnUrl);

  return {
    cdnUrl: helper.url,
    isEnabled: helper.isEnabled,
    resolvePath: helper.resolve,
    resolvePaths: helper.resolvePaths,
    config: {
      ...helper.config,
      resolve: helper.resolve,
    },
  };
};
