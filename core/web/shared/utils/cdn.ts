/**
 * Re-export runtime-neutral CDN helpers for stable `#shared/utils/cdn` imports.
 */
export {
  buildCdnUrl,
  createCdnHelper,
  isCdnUrl,
  resolveCdnPath,
  resolveCdnPaths,
  stripCdnPrefix,
  type CdnConfig,
} from '@tgmc/utilities/universal';
