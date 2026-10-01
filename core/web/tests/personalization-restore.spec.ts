import { describe, expect, it } from 'vitest';

import { resolveBrandRolesState, restoreStyleSetup, withDerivedRole, type StyleSetup } from '../shared/personalization';

const setup = (id: string): StyleSetup =>
  ({
    id,
    name: id.toUpperCase(),
    brandRoles: resolveBrandRolesState('#ac1922'),
    motion: 'system',
    background: 'particles',
  }) as StyleSetup;

describe('restoreStyleSetup (Undo delete)', () => {
  const [a, b, c] = [setup('a'), setup('b'), setup('c')];

  it('puts the setup back at its original index', () => {
    expect(restoreStyleSetup([a, c], b, 1).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('clamps an out-of-range index', () => {
    expect(restoreStyleSetup([a], c, 9).map((s) => s.id)).toEqual(['a', 'c']);
    expect(restoreStyleSetup([b], a, -3).map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('never duplicates a setup that is already present', () => {
    expect(restoreStyleSetup([a, b], b, 0).map((s) => s.id)).toEqual(['a', 'b']);
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
