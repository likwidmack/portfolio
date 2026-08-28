import deepSet from './deepSet.js';
import { isClass, isObject } from './index.js';

const isUnsafePropertyKey = (prop: string): boolean =>
  prop === '__proto__' || prop === 'constructor' || prop === 'prototype';

/**
 * Deeply merges one or more source objects into `rootObj` (mutates and returns it).
 *
 * - Plain object → plain object / class instance: recurse
 * - Array → array: unique-merge via {@link deepSet}
 * - Otherwise: overwrite the property
 *
 * @param rootObj - Target object (defaults to `{}`)
 * @param objs - Sources applied left-to-right
 * @returns The mutated `rootObj`
 *
 * @example
 * ```ts
 * deepAssign({ a: { x: 1 } }, { a: { y: 2 } }); // { a: { x: 1, y: 2 } }
 * ```
 */
export const deepAssign = (rootObj: any = {}, ...objs: any[]) => {
  while (objs.length) {
    const o: any = objs.shift() as any;
    for (const [prop, value] of Object.entries(o)) {
      if (!Object.prototype.hasOwnProperty.call(o, prop)) continue;
      if (isUnsafePropertyKey(prop)) continue;
      assignObj(rootObj, prop, value);
    }
  }

  return rootObj;
};

function assignObj(rootObj: any, prop: string, value: any): void {
  if (isUnsafePropertyKey(prop)) return;

  if (Array.isArray(value) && Array.isArray(rootObj[prop])) {
    rootObj[prop] = deepSet(rootObj[prop] as any, value);
  } else if (isObject(value) && (isObject(rootObj[prop]) || isClass(rootObj[prop]))) {
    rootObj[prop] = deepAssign(rootObj[prop] ?? {}, value);
  } else {
    rootObj[prop] = value;
  }
}

export default deepAssign;
