/**
 * Runtime type and environment helpers for `@tgmc/utilities`.
 */

/**
 * `true` when `obj` is a plain object or function that has a callable `constructor`
 * (includes class instances and many plain objects whose constructor is `Object`).
 */
export const isClass = (obj: any) => (isObject(obj) || isFunc(obj)) && isFunc(obj.constructor);

/** `true` when `obj` is a function (via `Object.prototype.toString`). */
export const isFunc = (obj: any) => Object.prototype.toString.call(obj) === '[object Function]';

/** `true` when `obj` is a plain object (`[object Object]`). Arrays and null are false. */
export const isObject = (obj: any) => Object.prototype.toString.call(obj) === '[object Object]';

/** `true` when `obj` is `undefined` or `null`. */
export const isUnd = (obj: any) => typeof obj === 'undefined' || obj === null;

/**
 * Detects a Node.js runtime via `process.versions.node`.
 * Safe to call when `process` is missing (returns `false`).
 */
export function isNodeEnv(): boolean {
  try {
    return typeof process !== 'undefined' && process.versions !== null && process.versions.node !== null;
  } catch {
    return false;
  }
}

/**
 * Detects a browser-like runtime with both `window` and `document`.
 * Safe to call in Node (returns `false`).
 */
export function isBrowserEnv(): boolean {
  try {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  } catch {
    return false;
  }
}
