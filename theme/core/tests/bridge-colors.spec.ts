import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { COLOR_RENAME_MAP, isNewColorName } from '../src/color-rename.js';
import { themePrimeVuePresetOverrides } from '../src/primevue.js';
import { compileRootCss, makeColourClassifier, parseRules, varRefs } from './helpers/css-decls.js';
// @ts-expect-error — plain ESM script without type declarations (scripts/rename-color-vars.mjs).
import { loadColorRenames, renameColorVarsInDirs } from '../../../scripts/rename-color-vars.mjs';

/**
 * Colour-system bridges stage (spec: docs/superpowers/specs/2026-09-24-color-system-design.md,
 * plan Task 7, rulings R-T7a–c): the PrimeVue preset, the Foundation bridge values and every
 * other part of the theme package read only the new `--theme-…-color` names (or the kept palette names).
 * PrimeVue's own `--p-*` variables are the library's interface and stay as they are. The Foundation
 * bridge (`--foundation-*`, a third-party interface whose names are kept) is guarded in
 * `color-naming.spec.ts`.
 */
const decls = parseRules(compileRootCss()).flatMap((r) => r.decls.map(([name, value]) => ({ name, value, rule: r })));
const declared = new Set(decls.map((d) => d.name));
const { renames, palette } = COLOR_RENAME_MAP;
const isColour = makeColourClassifier(
  (name) => decls.filter((d) => d.name === name).map((d) => d.value),
  (name) => name in renames || isNewColorName(name)
);
/** A declared name that holds a colour somewhere (any mode). */
const holdsColour = (name: string) => decls.some((d) => d.name === name && isColour(d.value));

/** Why a `var()` reference in a colour-bearing value is not allowed, or `undefined` when it is. */
function refProblem(ref: string): string | undefined {
  if (ref in renames) return `old name (use ${renames[ref]})`;
  if (ref.startsWith('--p-')) return undefined; // PrimeVue's own interface (R-T7c)
  if (palette.includes(ref)) return undefined; // kept palette names
  if (isNewColorName(ref)) return declared.has(ref) ? undefined : 'undeclared new name';
  if (!declared.has(ref)) return 'undeclared name';
  if (holdsColour(ref)) return 'colour held by a non --theme-…-color name';
  return undefined; // declared non-colour (radius, type floor …)
}

/** Every string leaf of a nested object, with its dotted path. */
function leaves(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]];
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [];
}

describe('PrimeVue preset (themePrimeVuePreset) reads the new colour names', () => {
  const strings = leaves(themePrimeVuePresetOverrides);

  it('has colour values to check', () => {
    expect(strings.length).toBeGreaterThan(100);
  });

  it('has no hex literals', () => {
    const offenders = strings.filter(([, v]) => /#[0-9a-f]{3,8}\b/i.test(v)).map(([p, v]) => `${p}: ${v}`);
    expect(offenders).toEqual([]);
  });

  it('references only declared --theme-…-color / palette names (or non-colour names / --p-*)', () => {
    const offenders: string[] = [];
    for (const [path, value] of strings)
      for (const ref of varRefs(value)) {
        const problem = refProblem(ref);
        if (problem) offenders.push(`${path}: ${ref} — ${problem}`);
      }
    expect(offenders).toEqual([]);
  });
});

describe('theme package has no old colour names left (R-T7a)', () => {
  it('rename-color-vars --check theme/core/scss theme/core/src reports 0', async () => {
    const themeRoot = join(import.meta.dirname, '..');
    const map = await loadColorRenames();
    const { total, files } = renameColorVarsInDirs([join(themeRoot, 'scss'), join(themeRoot, 'src')], map, {
      write: false,
    });
    expect(
      files.map((f: { file: string; count: number }) => `${f.file} (${f.count})`),
      `${total} old colour names`
    ).toEqual([]);
  });
});

describe('the classic PrimeVue Sass path is archived (Nora styled mode only)', () => {
  const scssRoot = join(import.meta.dirname, '../scss');

  it('drops the classic PrimeVue switches from _config.scss', () => {
    const config = readFileSync(join(scssRoot, '_config.scss'), 'utf8');
    expect(config).not.toMatch(/\$theme-enable-primevue|\$theme-primevue-entry/);
  });

  it('keeps the primevue cascade layer for the Nora cssLayer, with no Sass primevue layer', () => {
    const index = readFileSync(join(scssRoot, 'index.scss'), 'utf8');
    expect(index).toContain('@layer normalize, foundation, primevue, theme;');
    expect(index).not.toContain("@use 'layers/primevue';");
  });

  it('removes the classic layer, its entries and the settings bridge', () => {
    for (const file of [
      'layers/_primevue.scss',
      'layers/contents/_primevue.scss',
      'layers/contents/_primevue-aura-dark-indigo.scss',
      'layers/contents/_primevue-aura-light-indigo.scss',
      'layers/contents/_primevue-lara-dark-blue.scss',
      'layers/contents/_primevue-lara-light-blue.scss',
      'bridges/_primevue-settings.scss',
    ])
      expect(existsSync(join(scssRoot, file)), file).toBe(false);
  });

  it('no stylesheet in the repo sets the removed switches', () => {
    const repoRoot = join(import.meta.dirname, '../../..');
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        // Build output, caches and dot-folders (.nx, .nuxt, .output …) hold no source stylesheets.
        if (
          entry.name.startsWith('.') ||
          ['node_modules', 'dist', '_archive', 'test-output', 'coverage'].includes(entry.name)
        )
          continue;
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (
          /\.(?:scss|vue)$/.test(entry.name) &&
          /\$theme-(?:enable-primevue|primevue-entry)\s*:/.test(readFileSync(path, 'utf8'))
        )
          offenders.push(
            path
              .slice(repoRoot.length + 1)
              .split('\\')
              .join('/')
          );
      }
    };
    for (const top of ['core', 'theme', 'packages']) walk(join(repoRoot, top));
    expect(offenders).toEqual([]);
    // Reads every source stylesheet in the repo: slow on a cold disk cache next to other suites.
  }, 30_000);
});
