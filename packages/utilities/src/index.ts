/**
 * Default (Node / Nitro / AWS Lambda–safe) entry for `@tgmc/utilities`.
 *
 * Exports type guards, env helpers, `Logging`, `deepAssign` / `deepSet`, CDN
 * URL helpers, `toSnakeCase`, and Node `EventHandler` / `EventsHandler`.
 * Does **not** export browser DOM or storage APIs — use `@tgmc/utilities/browser`
 * for those.
 *
 * @packageDocumentation
 */
export * from './lib/index.js';

export { buildCdnUrl, createCdnHelper, isCdnUrl, resolveCdnPath, resolveCdnPaths, stripCdnPrefix } from './lib/cdn.js';
export type { CdnConfig } from './lib/cdn.js';
export { default as Logging } from './lib/class-models/logging.js';
export { default as deepAssign } from './lib/deepAssign.js';
export { default as deepSet } from './lib/deepSet.js';
export { EventHandler, EventsHandler, default as NodeEventsHandler } from './lib/node/events-handler.js';
export { toSnakeCase, default as toSnakeCaseDefault } from './lib/to-snake-case.js';
