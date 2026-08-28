import { describe, expect, it } from 'vitest';

import { primeIconsRoot, viteFsAllowRoots } from '../config-properties/vite-fs-allow';

describe('Vite filesystem allow list', () => {
  it('allows PrimeIcons through its real package path for linked worktree dependencies', () => {
    expect(viteFsAllowRoots).toContain(primeIconsRoot);
  });
});
