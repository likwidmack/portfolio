/**
 * Browser-only entry for `@tgmc/utilities/browser`.
 *
 * Includes DOM events, `WebStorageService` / `WebStorage`, `StorageQueue`,
 * `debounce`, `throttle`, and `FakeLocalStorage`.
 *
 * **Do not** import this subpath from Nitro server code or AWS Lambda handlers.
 * Prefer `@tgmc/utilities` on the server graph.
 *
 * @packageDocumentation
 */
export { default as FakeLocalStorage } from './lib/class-models/fake-local-storage.js';
export { default as DefaultStorageQueue, StorageQueue } from './lib/class-models/storage-queue.js';
export {
  StorageService,
  WebStorageService,
  default as defaultStorage,
  storage,
} from './lib/class-models/web-storage-service.js';
export type {
  CookieOptions,
  StorageDriver,
  StorageGetOptions,
  StorageSetOptions,
  WebStorageKey,
} from './lib/class-models/web-storage-service.js';
export { default as DefaultWebStorage, StorageProperty, WebStorage } from './lib/class-models/web-storage.js';
export type { WebStorageOptions } from './lib/class-models/web-storage.js';
export { debounce, default as defaultDebounce } from './lib/debounce.js';
export { default as DomEventsHandler, EventHandler, EventsHandler } from './lib/dom/events-handler.js';
export { default as defaultThrottle, throttle } from './lib/throttle.js';
