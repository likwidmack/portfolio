import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  baseColors,
  colorsLibrary,
  darkCssVariables,
  lightCssVariables,
  palettes,
  semanticColors,
  themeColors,
} from '../src/tokens.js';

const REQUIRED_CSS_KEYS = [
  '--primary-color',
  '--secondary-color',
  '--text-color',
  '--main-background',
  '--main-background-secondary',
  '--primary-hover',
  '--button-fg',
] as const;

const cssDump = colorsLibrary.cssVariables;

describe('Sass-aligned token mirrors (JSON-backed)', () => {
  it('exposes the theme colors.json library with Sass-aligned roles', () => {
    expect(colorsLibrary.theme.dark.primary).toBe(themeColors.dark.primary);
    expect(colorsLibrary.palettes.midnightMagic.darkAmethyst).toBe(palettes.midnightMagic.darkAmethyst);
    expect(Object.keys(colorsLibrary.named).length).toBeGreaterThan(500);
  });

  it('applies Sass overrides over catalog theme.light/dark conflicts', () => {
    expect(themeColors.light.background).toBe(colorsLibrary.theme.light.background);
    expect(themeColors.dark.background).toBe(colorsLibrary.theme.dark.background);
    expect(colorsLibrary.primary.default).toBe(themeColors.dark.primary);
  });

  it('pins all palette packs to the JSON library', () => {
    expect(palettes).toEqual(colorsLibrary.palettes);
  });

  it('pins base and semantic maps to the JSON library', () => {
    expect(baseColors).toEqual(colorsLibrary.base);
    expect(semanticColors).toEqual(colorsLibrary.semantic);
  });

  it('mirrors brand and surface roles from tokens/_colors.scss via JSON', () => {
    expect(themeColors.light.primary).toBe(colorsLibrary.theme.light.primary);
    expect(themeColors.dark.primary).toBe(colorsLibrary.theme.dark.primary);
    expect(themeColors.light.secondary).toBe(colorsLibrary.theme.light.secondary);
    expect(themeColors.dark.secondary).toBe(colorsLibrary.theme.dark.secondary);
    expect(themeColors.light.background).toBe(colorsLibrary.theme.light.background);
    expect(themeColors.dark.background).toBe(colorsLibrary.theme.dark.background);
    expect(semanticColors.success).toBe(colorsLibrary.semantic.success);
  });

  it('pins Sass primary-hover from parchment/ink adjust (pipeline golden in colors.json)', () => {
    // Values come from dart-sass `color.adjust` on $css-primary-*-hover — pin Sass output via JSON dump.
    expect(darkCssVariables['--primary-hover']).toBe(cssDump.dark['--primary-hover']);
    expect(lightCssVariables['--primary-hover']).toBe(cssDump.light['--primary-hover']);
  });

  it('exposes wide Sass dump tokens on colorsLibrary.sass / named', () => {
    expect(Object.keys(colorsLibrary.sass).length).toBeGreaterThan(200);
    expect(colorsLibrary.named.cssRedLight?.toLowerCase()).toBe(colorsLibrary.sass.cssRedLight?.toLowerCase());
    expect(colorsLibrary.named.accentSoft?.toLowerCase()).toBe(colorsLibrary.sass.accentSoft?.toLowerCase());
  });

  it('keeps build-colors-json free of hand-copied inventoried hex/rgb literals', () => {
    const builder = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../bin/build-colors-json.mjs'), 'utf8');
    // Allow normalize helpers / comments — forbid a hand-maintained SASS = { hex blob }.
    expect(builder).not.toMatch(/const SASS\s*=\s*\{/);
    expect(builder).toContain('sass.compile');
    expect(builder).toContain('colors-dump.scss');
  });

  it('mirrors Sass accent as complementary of primary', () => {
    expect(lightCssVariables['--accent-color']).toBe(cssDump.light['--accent-color']);
    expect(darkCssVariables['--accent-color']).toBe(cssDump.dark['--accent-color']);
  });

  it('includes required CSS keys on light and dark maps', () => {
    for (const key of REQUIRED_CSS_KEYS) {
      expect(lightCssVariables[key]).toBeTruthy();
      expect(darkCssVariables[key]).toBeTruthy();
    }
    expect(lightCssVariables['--primary-color']).toBe(themeColors.light.primary);
    expect(darkCssVariables['--primary-color']).toBe(themeColors.dark.primary);
  });

  it('omits layout ratio/breakpoint keys from mode maps (Sass media queries own those)', () => {
    expect(lightCssVariables).not.toHaveProperty('--surface-ratio');
    expect(darkCssVariables).not.toHaveProperty('--breakpoint');
  });

  it('keeps inventoried mirror bindings free of color literals', () => {
    const tokensPath = join(dirname(fileURLToPath(import.meta.url)), '../src/tokens.ts');
    const source = readFileSync(tokensPath, 'utf8');
    const bindingSection = source.slice(0, source.indexOf('export function hslToHex'));
    const withoutImports = bindingSection
      .replace(/import[\s\S]*?from\s+['"][^'"]+['"];?\s*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(withoutImports).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(withoutImports).not.toMatch(/\brgba?\s*\(/);
  });

  it('mirrors the accessible interaction roles from _colors.scss via JSON', () => {
    expect(darkCssVariables['--focus-ring']).toBe(cssDump.dark['--focus-ring']);
    expect(lightCssVariables['--focus-ring']).toBe(cssDump.light['--focus-ring']);
    expect(darkCssVariables['--link-color']).toBe(cssDump.dark['--link-color']);
    expect(lightCssVariables['--link-color']).toBe(cssDump.light['--link-color']);
    expect(darkCssVariables['--form-border-color']).toBe(cssDump.dark['--form-border-color']);
    expect(lightCssVariables['--primary-fill']).toBe(cssDump.light['--primary-fill']);
    expect(darkCssVariables['--success-ink']).toBe(cssDump.dark['--success-ink']);
  });
});
