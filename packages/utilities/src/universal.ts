/**
 * Runtime-neutral helpers safe to import from Nitro, Lambda, and browser code.
 *
 * This entry deliberately excludes Node EventEmitter and all DOM/storage APIs.
 * Use the default entry for Node helpers and `/browser` for browser-only APIs.
 *
 * @packageDocumentation
 */
export { buildCdnUrl, createCdnHelper, isCdnUrl, resolveCdnPath, resolveCdnPaths, stripCdnPrefix } from './lib/cdn.js';
export type { CdnConfig } from './lib/cdn.js';
export { toSnakeCase, default as toSnakeCaseDefault } from './lib/to-snake-case.js';
