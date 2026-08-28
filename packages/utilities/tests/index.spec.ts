import { isBrowserEnv, isClass, isFunc, isNodeEnv, isObject, isUnd } from '../src/lib/index.js';

describe('type / env helpers', () => {
  it('isUnd', () => {
    expect(isUnd(undefined)).toBe(true);
    expect(isUnd(null)).toBe(true);
    expect(isUnd(0)).toBe(false);
  });

  it('isObject / isFunc / isClass', () => {
    expect(isObject({ a: 1 })).toBe(true);
    expect(isObject([])).toBe(false);
    expect(isFunc(() => 1)).toBe(true);
    class Foo {}
    expect(isClass(new Foo())).toBe(true);
  });

  it('isNodeEnv / isBrowserEnv in node vitest', () => {
    expect(isNodeEnv()).toBe(true);
    expect(isBrowserEnv()).toBe(false);
  });
});
