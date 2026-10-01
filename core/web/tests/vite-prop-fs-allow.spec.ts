import { describe, expect, it } from 'vitest';

import { viteFsAllowRoots } from '../config-properties/vite-fs-allow';

describe('Vite filesystem allow list', () => {
  it('allows only the web app and workspace root (no icon-font package roots)', () => {
    expect(viteFsAllowRoots).toHaveLength(2);
    expect(viteFsAllowRoots.some((root) => /primeicons/i.test(root))).toBe(false);
  });
});
