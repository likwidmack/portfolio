import { beforeEach, describe, expect, it } from 'vitest';

import { createStyleSetup, withDerivedRole, type StyleSetup } from '../shared/preferences';
import { resolveBrandRolesState } from '../shared/preferences/document';
import { setupsApi } from '../shared/preferences/setups';
import { defaultPreferenceDocument } from '../shared/preferences/storage';

const setup = (id: string): StyleSetup =>
  createStyleSetup(
    id.toUpperCase(),
    { ...defaultPreferenceDocument(), brandRoles: resolveBrandRolesState('#ac1922') },
    id
  );

function storageWith(...setups: StyleSetup[]) {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
  setupsApi.invalidate();
  for (const item of setups) setupsApi.save(storage, item);
  return storage;
}

const restoredIds = (storage: ReturnType<typeof storageWith>, item: StyleSetup, index: number) =>
  setupsApi.restore(storage, item, index).setups.map((s) => s.id);

describe('setupsApi.restore (Undo delete)', () => {
  const [a, b, c] = [setup('a'), setup('b'), setup('c')];

  beforeEach(() => {
    setupsApi.invalidate();
  });

  it('puts the setup back at its original index', () => {
    expect(restoredIds(storageWith(a, c), b, 1)).toEqual(['a', 'b', 'c']);
  });

  it('clamps an out-of-range index', () => {
    expect(restoredIds(storageWith(a), c, 9)).toEqual(['a', 'c']);
    expect(restoredIds(storageWith(b), a, -3)).toEqual(['a', 'b']);
  });

  it('never duplicates a setup that is already present', () => {
    expect(restoredIds(storageWith(a, b), b, 0)).toEqual(['a', 'b']);
  });
});

describe('withDerivedRole ("Derive from primary")', () => {
  const locked = { ...resolveBrandRolesState('#ac1922'), secondary: '#123456', secondaryLocked: true };

  it('unlocks and re-derives the role from primary when derive is on', () => {
    const next = withDerivedRole(locked, 'secondary', true);
    expect(next.secondaryLocked).toBe(false);
    expect(next.secondary).toBe(resolveBrandRolesState('#ac1922').secondary);
  });

  it('locks the current value when derive is off, leaving the other role alone', () => {
    const base = resolveBrandRolesState('#ac1922');
    const next = withDerivedRole(base, 'accent', false);
    expect(next.accentLocked).toBe(true);
    expect(next.accent).toBe(base.accent);
    expect(next.secondaryLocked).toBe(false);
  });
});
