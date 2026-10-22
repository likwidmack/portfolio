// @vitest-environment node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Focus rings use the focus role through the theme `focus-ring` mixin (2px
 * `--theme-focus-ring-color` outline — visible in forced-colors mode), never the brand primary
 * (≈ 2.7:1 on the dark page) or a box-shadow alone (`focus-ring-shadow` pairs it with an outline). Theme side: `theme/core/tests/focus-rings.spec.ts`.
 */
const app = join(import.meta.dirname, '../app');
const read = (rel: string) => readFileSync(join(app, rel), 'utf8');

describe('component focus rings', () => {
  it('the header "On view" link uses the focus ring, not primary', () => {
    const nav = read('components/AppPrimaryNav/AppPrimaryNav.scss');
    expect(nav).not.toMatch(/outline:[^;]*--theme-primary-color/);
    expect(nav).toMatch(/&__on-view[\s\S]*?&:focus-visible \{\s*@include focus-ring\(4px\);/);
  });

  it('UiButton draws the 3px glow with a transparent outline forced colours repaint (one ring, not two)', () => {
    const button = read('components/ui/UiButton.vue');
    expect(button).toMatch(
      /&:focus-visible,\s*&:focus \{\s*@include focus-ring-shadow\(\s*0 0 0 3px var\(--theme-focus-ring-color\),/
    );
    expect(button).not.toMatch(/@include focus-ring;/);
  });
});
