import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { themePrimeVuePreset } from '../src/primevue';

const typeFloor = 'max(var(--type-min, 12px), 0.75rem)';

describe('PrimeVue preset type floors', () => {
  it('overrides Nora badge/tag/progressbar labels that default to 0.625rem (10px)', () => {
    const components = themePrimeVuePreset.components as {
      badge?: { root?: { fontSize?: string }; sm?: { fontSize?: string } };
      tag?: { root?: { fontSize?: string } };
      progressbar?: { label?: { fontSize?: string } };
    };

    expect(components.badge?.root?.fontSize).toBe(typeFloor);
    expect(components.badge?.sm?.fontSize).toBe(typeFloor);
    expect(components.tag?.root?.fontSize).toBe(typeFloor);
    expect(components.progressbar?.label?.fontSize).toBe(typeFloor);
  });

  it('keeps a matching SCSS floor for badge/tag/progress labels', async () => {
    const scss = await readFile(
      join(dirname(fileURLToPath(import.meta.url)), '../scss/globals/_primevue-union.scss'),
      'utf8'
    );
    expect(scss).toContain('.p-badge.p-component');
    expect(scss).toContain('.p-progressbar-label');
    expect(scss).toContain(typeFloor);
  });
});
