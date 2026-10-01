// @vitest-environment node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const css = (...parts: string[]) => join(root, 'assets', 'css', ...parts);

describe('type recipes', () => {
  it('binds display/title/header families and publishes chrome metric tokens', async () => {
    const variables = await readFile(css('_variables.scss'), 'utf8');

    expect(variables).toContain('--font-family-display');
    expect(variables).toContain('--font-family-title');
    expect(variables).toContain('--font-family-header: var(--font-family-title)');
    expect(variables).toContain('--type-eyebrow-size');
    expect(variables).toContain('--type-eyebrow-tracking');
    expect(variables).toContain('--type-meta-size');
    expect(variables).toContain('--type-meta-tracking');
    expect(variables).toMatch(/Ladder:.*display.*title.*eyebrow.*meta/i);
  });

  it('exposes portfolio-type-* mixins and keeps portfolio-eyebrow as alias', async () => {
    const mixins = await readFile(css('_mixins.scss'), 'utf8');

    expect(mixins).toContain('@mixin portfolio-type-display');
    expect(mixins).toContain('@mixin portfolio-type-title');
    expect(mixins).toContain('@mixin portfolio-type-eyebrow');
    expect(mixins).toContain('@mixin portfolio-type-meta');
    expect(mixins).toContain('@mixin portfolio-eyebrow');
    expect(mixins).toMatch(/@mixin portfolio-eyebrow\s*\{[\s\S]*?@include portfolio-type-eyebrow/);
  });

  it('wires portfolio h1/h2 to display/title recipes (not mono)', async () => {
    const globals = await readFile(css('_globals.scss'), 'utf8');

    expect(globals).toMatch(/\.portfolio-page\s*\{[\s\S]*?h1\s*\{[\s\S]*?@include portfolio-type-display/);
    expect(globals).toMatch(/\.portfolio-page\s*\{[\s\S]*?h2\s*\{[\s\S]*?@include portfolio-type-title/);
    expect(globals).not.toMatch(/\.portfolio-page\s*\{[\s\S]*?h1\s*\{[\s\S]*?--font-family-mono/);
    expect(globals).not.toMatch(/\.portfolio-page\s*\{[\s\S]*?h2\s*\{[\s\S]*?--font-family-mono/);
    expect(globals).toContain('@include portfolio-type-eyebrow');
    expect(globals).toContain('@include portfolio-type-meta');
  });
});
