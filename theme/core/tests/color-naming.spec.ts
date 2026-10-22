import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  COLOR_ALPHA_STEPS,
  COLOR_RENAME_MAP,
  THEME_COLOR_NAME,
  excludedColorNames,
  isNewColorName,
  retiredColorNames,
} from '../src/color-rename.js';
import { DERIVED_ROLE_TOKENS, darkCssVariables, lightCssVariables } from '../src/tokens.js';
import { compileRootCss, makeColourClassifier, parseRules, varRefs } from './helpers/css-decls.js';

/**
 * Colour naming guard — strict (spec: docs/superpowers/specs/2026-09-24-color-system-design.md,
 * rule 4; colour system Task 8, R-T8g). Every colour custom property `_root.scss` emits is a
 * `--theme-…-color` name, with exactly these exceptions (all listed in `src/color-rename-map.json`):
 * - the ten basic colours `--<hue>-color` (`paletteNames`) and the data palettes (`palette`),
 *   kept by the owner;
 * - `--foundation-*`, Foundation's third-party interface (like PrimeVue's `--p-*`), and the
 *   non-colours (channel triplets, shadows, gradients) in `excluded`.
 * No aliases: the old names (`renames` keys) and the retired ones are not emitted at all. The map
 * stays for the codemod (`scripts/rename-color-vars.mjs`) and for the JS input normalisation.
 */
const css = compileRootCss();
const rules = parseRules(css);
const decls = rules.flatMap((r) => r.decls.map(([name, value]) => ({ name, value, rule: r })));
const declared = new Set(decls.map((d) => d.name));

const { renames, palette, paletteNames } = COLOR_RENAME_MAP;
const excluded = excludedColorNames();
const retired = retiredColorNames();
const newNames = new Set(Object.values(renames));
const oldNames = [...Object.keys(renames), ...retired];

/** A value is a colour when it is a colour literal / function / keyword or a var() of a colour. */
const isColour = makeColourClassifier(
  (name) => decls.filter((d) => d.name === name).map((d) => d.value),
  (name) => isNewColorName(name) || palette.includes(name)
);

const isRoot = (selector: string) => selector === ':root';

describe('colour rename map', () => {
  it('lists each name once and gives every rename a --theme-…-color name', () => {
    const all = [...Object.keys(renames), ...retired, ...palette, ...excluded];
    expect(new Set(all).size, 'duplicate entries across sections').toBe(all.length);
    for (const [old, next] of Object.entries(renames)) {
      expect(isNewColorName(next), `${old} → ${next}`).toBe(true);
      expect(old, 'an old name is not already a new name').not.toMatch(THEME_COLOR_NAME);
    }
  });

  it('has no runtime sources left: the six formerly runtime-written names are aliases (R-T3a/b)', () => {
    expect('runtimeSources' in COLOR_RENAME_MAP).toBe(false);
    expect({
      '--paper': renames['--paper'],
      '--ink': renames['--ink'],
      '--primary-color': renames['--primary-color'],
      '--secondary-color': renames['--secondary-color'],
      '--accent-color': renames['--accent-color'],
      '--button-fg': renames['--button-fg'],
    }).toEqual({
      '--paper': '--theme-paper-color',
      '--ink': '--theme-ink-color',
      '--primary-color': '--theme-primary-color',
      '--secondary-color': '--theme-secondary-color',
      '--accent-color': '--theme-accent-color',
      '--button-fg': '--theme-button-fg-color',
    });
  });

  it('allows the --<hue>-color exception for exactly the ten basic colours (owner rename)', () => {
    const hues = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'teal', 'blue', 'purple', 'magenta'];
    expect([...paletteNames].sort()).toEqual(hues.map((h) => `--${h}-color`).sort());
    for (const h of hues) {
      expect(renames[`--color-${h}`], `--color-${h}`).toBe(`--${h}-color`);
      const found = decls.filter((d) => d.name === `--${h}-color`);
      expect(found.length, `--${h}-color is declared per mode`).toBe(3);
      for (const d of found) expect(d.value, `--${h}-color holds a value`).toMatch(/^#/);
    }
    for (const name of Object.values(renames).filter((n) => !THEME_COLOR_NAME.test(n)))
      expect(paletteNames, `${name} is not an allowed exception`).toContain(name);
  });

  it('has no stale entries: every rename target, palette and excluded name is emitted', () => {
    for (const name of [...palette, ...excluded])
      expect(declared.has(name), `${name} is listed but not emitted`).toBe(true);
    for (const name of newNames) expect(declared.has(name), `${name} (new name) is not emitted`).toBe(true);
  });

  it('retires the pruned extras with a reason and no replacement (R-T8h)', () => {
    expect(COLOR_RENAME_MAP.retired.length).toBeGreaterThan(0);
    for (const group of COLOR_RENAME_MAP.retired) expect(group.reason, group.names.join(', ')).toMatch(/\w/);
    for (const name of retired) expect(renames[name], name).toBeUndefined();
  });

  it('no longer generates the alias partial (aliases removed in Task 8, R-T8a)', () => {
    const tokens = join(import.meta.dirname, '../scss/tokens');
    expect(existsSync(join(tokens, '_color-aliases.generated.scss'))).toBe(false);
    const builder = readFileSync(join(import.meta.dirname, '../bin/build-color-variations.mjs'), 'utf8');
    expect(builder).not.toMatch(/_color-aliases.generated|renderColorAliasesScss/);
  });
});

describe('colour classifier', () => {
  // Fake declarations: none of these names is --theme-…-color, so each must be flagged.
  const fake: Record<string, string> = {
    '--fake-hex': '#abc',
    '--fake-white': 'white',
    '--fake-black': 'BLACK',
    '--fake-transparent': 'transparent',
    '--fake-current': 'currentColor',
    '--fake-named': 'tomato',
    '--fake-oklch': 'oklch(70% 0.1 30)',
    '--fake-fallback-literal': 'var(--nowhere, #123456)',
    '--fake-fallback-keyword': 'var(--nowhere, white)',
    '--fake-fallback-nested': 'var(--nowhere, var(--fake-hex))',
    '--fake-ref-with-fallback': 'var(--fake-hex, 1px)',
    '--fake-chain': 'var(--fake-ref-with-fallback)',
    '--fake-known': 'var(--theme-text-color)',
  };
  const classify = makeColourClassifier(
    (name) => (name in fake ? [fake[name]!] : []),
    (name) => isNewColorName(name)
  );
  const flagged = (name: string) => classify(fake[name]!) && !isNewColorName(name);

  it.each(Object.keys(fake))('flags %s', (name) => {
    expect(flagged(name), `${name}: ${fake[name]}`).toBe(true);
  });

  it('does not flag non-colours', () => {
    for (const value of [
      '1px',
      '0 1px 2px rgb(var(--rgb-shadow) / 0.14)',
      'var(--space-4)',
      'var(--nowhere, 2rem)',
      '239 239 239',
      'linear-gradient(red, blue)',
    ])
      expect(classify(value), value).toBe(false);
  });
});

describe('colour naming guard (_root.scss) — strict, no aliases (R-T8g)', () => {
  it('every colour variable is a --theme-…-color name, a palette name, or excluded (Foundation, non-colours)', () => {
    const offenders: string[] = [];
    for (const { name, value } of decls) {
      if (palette.includes(name) || excluded.includes(name)) continue;
      if (isColour(value) && !isNewColorName(name)) offenders.push(`${name}: ${value}`);
    }
    expect(offenders).toEqual([]);
  });

  it('old names are gone: no old or retired name is declared in any rule (R-T8a)', () => {
    expect(oldNames.filter((name) => declared.has(name))).toEqual([]);
  });

  it('no declaration reads an old or retired name', () => {
    const old = new Set(oldNames);
    const offenders = decls.flatMap((d) =>
      varRefs(d.value)
        .filter((ref) => old.has(ref))
        .map((ref) => `${d.name} → ${ref}`)
    );
    expect(offenders).toEqual([]);
  });

  it('prunes the Task-2 extras nothing reads any more (R-T8h)', () => {
    const pruned = [
      ...['primary', 'secondary', 'accent'].flatMap((c) => [`--theme-${c}-brand-color`, `--theme-${c}-a20-color`]),
      '--theme-accent-a20-soft-color',
      '--theme-accent-a80-soft-color',
    ];
    expect(pruned.filter((name) => declared.has(name))).toEqual([]);
  });

  it('new names derive only from --theme-* names', () => {
    const offenders: string[] = [];
    for (const d of decls) {
      if (!newNames.has(d.name)) continue;
      for (const ref of varRefs(d.value)) {
        const ok = ref.startsWith('--theme-') || !declared.has(ref);
        if (!ok) offenders.push(`${d.name} → ${ref}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  /** `name`'s declarations per mode rule: dark `:root`, then the two light-mode rules. */
  const perMode = (name: string) =>
    decls
      .filter((d) => d.name === name)
      .map((d) => [d.rule.selector === ':root' && d.rule.at.length === 0 ? 'dark' : 'light', d.value]);

  it('--theme-paper-color / --theme-ink-color point at the per-mode pair the runtime writes (R-T3a)', () => {
    for (const g of ['paper', 'ink']) {
      expect(perMode(`--theme-${g}-color`), g).toEqual([
        ['dark', `var(--theme-${g}-dark-color)`],
        ['light', `var(--theme-${g}-light-color)`],
        ['light', `var(--theme-${g}-light-color)`],
      ]);
    }
  });

  it('--button-fg: dark reads the per-mode ink, light is white on the primary fill (R-T3b, option C)', () => {
    expect(perMode('--theme-button-fg-color')).toEqual([
      ['dark', 'var(--theme-button-fg-dark-color)'],
      ['light', 'var(--theme-on-primary-color)'],
      ['light', 'var(--theme-on-primary-color)'],
    ]);
    expect(perMode('--theme-button-fg-dark-color')).toEqual([['dark', expect.stringMatching(/^#[0-9a-f]{6}$/)]]);
    expect(perMode('--theme-button-fg-light-color')).toEqual([]);
  });

  it('primary buttons: dark fill is the primary + gradient; light fill is the white-text primary fill, no gradient', () => {
    expect(perMode('--theme-primary-fill-color')).toEqual([
      ['dark', 'var(--theme-primary-fill-dark-color)'],
      ['light', 'var(--theme-primary-fill-light-color)'],
      ['light', 'var(--theme-primary-fill-light-color)'],
    ]);
    for (const m of ['light', 'dark'])
      expect(perMode(`--theme-primary-fill-${m}-color`), m).toEqual([
        ['dark', expect.stringMatching(/^#[0-9a-f]{6}$/)],
      ]);
    expect(perMode('--theme-button-fill-color')).toEqual([
      ['dark', 'var(--theme-primary-color)'],
      ['light', 'var(--theme-primary-fill-color)'],
      ['light', 'var(--theme-primary-fill-color)'],
    ]);
    // Hover / active keep the fill: dark the dark fill (was undeclared → transparent), light the primary fill.
    expect(perMode('--theme-button-hover-fill-color')).toEqual([
      ['dark', 'var(--theme-button-fill-color)'],
      ['light', 'var(--theme-primary-fill-color)'],
      ['light', 'var(--theme-primary-fill-color)'],
    ]);
    expect(perMode('--button-bg')[0]![1], '--button-bg dark').toMatch(/^linear-gradient\(/);
    expect(perMode('--button-bg').slice(1)).toEqual([
      ['light', 'none'],
      ['light', 'none'],
    ]);
    // Light-only overrides: dark rules fall back to their own gradients.
    for (const g of ['--button-solid-bg', '--button-solid-bg-hover'])
      expect(perMode(g), g).toEqual([
        ['light', 'none'],
        ['light', 'none'],
      ]);
    // The label over the sheen is the button text in both modes (its gradient stops are built for it).
    expect(perMode('--theme-button-secondary-fg-color')).toEqual([['dark', 'var(--theme-button-fg-color)']]);
  });

  it('primary ink: the active name points at the per-mode text-contrast primary (brand small text)', () => {
    expect(perMode('--theme-primary-ink-color')).toEqual([
      ['dark', 'var(--theme-primary-ink-dark-color)'],
      ['light', 'var(--theme-primary-ink-light-color)'],
      ['light', 'var(--theme-primary-ink-light-color)'],
    ]);
    for (const m of ['light', 'dark'])
      expect(perMode(`--theme-primary-ink-${m}-color`), m).toEqual([['dark', expect.stringMatching(/^#[0-9a-f]{6}$/)]]);
  });

  it('secondary ink: the active name points at the per-mode text-contrast secondary', () => {
    expect(perMode('--theme-secondary-ink-color')).toEqual([
      ['dark', 'var(--theme-secondary-ink-dark-color)'],
      ['light', 'var(--theme-secondary-ink-light-color)'],
      ['light', 'var(--theme-secondary-ink-light-color)'],
    ]);
    for (const m of ['light', 'dark'])
      expect(perMode(`--theme-secondary-ink-${m}-color`), m).toEqual([
        ['dark', expect.stringMatching(/^#[0-9a-f]{6}$/)],
      ]);
  });

  it('status and focus names fold onto the Task-1 variations (R-T3c)', () => {
    for (const st of ['success', 'warning', 'error', 'info'])
      expect(perMode(`--theme-${st}-hue-color`), st).toEqual([['dark', `var(--theme-${st}-color)`]]);
    expect(perMode('--theme-focus-ring-color')).toEqual([['dark', 'var(--theme-focus-color)']]);
  });

  it('emits the derived families: neutral steps and ink / paper / main-colour alphas', () => {
    const steps = Object.values(renames)
      .map((name) => /^--theme-neutral-(\d+)-color$/.exec(name)?.[1])
      .filter((s): s is string => Boolean(s));
    expect(steps.length).toBeGreaterThanOrEqual(21);
    for (const step of steps) expect(declared.has(`--theme-neutral-${step}-color`), step).toBe(true);
    for (const c of ['ink', 'paper', 'primary', 'secondary', 'accent'])
      for (const n of COLOR_ALPHA_STEPS) {
        const name = `--theme-${c}-a${n}-color`;
        const d = decls.find((x) => x.name === name && isRoot(x.rule.selector) && x.rule.at.length === 0);
        expect(d, name).toBeTruthy();
        expect(d!.value, name).toBe(`color-mix(in srgb, var(--theme-${c}-color) ${n}%, transparent)`);
      }
  });
});

describe('Foundation bridge (third-party interface, R-T7b)', () => {
  const foundation = decls.filter((d) => d.name.startsWith('--foundation-'));
  const foundationGroup = COLOR_RENAME_MAP.excluded.find((g) => g.names.includes('--foundation-primary'));

  it('keeps the --foundation-* names exempt from renaming: listed in excluded, never in renames', () => {
    expect(foundationGroup?.reason).toMatch(/Third-party interface \(Foundation\)/);
    for (const d of foundation) expect(renames[d.name], d.name).toBeUndefined();
    for (const d of foundation.filter((x) => isColour(x.value)))
      expect(foundationGroup!.names, `${d.name} is a listed bridge name`).toContain(d.name);
  });

  it('each colour value references declared --theme-…-color / palette names only — no old names, no literals', () => {
    expect(foundation.length).toBeGreaterThanOrEqual(22);
    const offenders: string[] = [];
    for (const d of foundation) {
      if (!isColour(d.value)) continue; // --foundation-global-radius
      const refs = varRefs(d.value);
      if (!refs.length) offenders.push(`${d.name}: ${d.value} (literal)`);
      for (const ref of refs) {
        const ok = (isNewColorName(ref) || palette.includes(ref)) && declared.has(ref);
        if (!ok) offenders.push(`${d.name}: ${ref}`);
      }
      // Only var() references (with var() fallbacks) — nothing left once they are removed.
      const rest = d.value.replace(/var\(\s*--[\w-]+\s*,?/g, '').replace(/[\s)]/g, '');
      if (rest) offenders.push(`${d.name}: ${d.value} (literal "${rest}")`);
    }
    expect(offenders).toEqual([]);
  });
});

describe('token mirrors publish only the new names (R-T8c)', () => {
  it('darkCssVariables / lightCssVariables: every colour key is an emitted --theme-…-color or palette name', () => {
    for (const v of [darkCssVariables, lightCssVariables] as Array<Record<string, string>>) {
      const keys = Object.keys(v);
      expect(
        keys.filter((k) => oldNames.includes(k)),
        'old keys'
      ).toEqual([]);
      for (const key of keys.filter((k) => k !== '--border-radius-md')) {
        expect(isNewColorName(key) || palette.includes(key), key).toBe(true);
        expect(declared.has(key), `${key} is emitted`).toBe(true);
      }
    }
  });

  it('DERIVED_ROLE_TOKENS lists only emitted --theme-…-color names', () => {
    for (const name of DERIVED_ROLE_TOKENS) {
      expect(name, name).toMatch(THEME_COLOR_NAME);
      expect(declared.has(name), `${name} is emitted`).toBe(true);
    }
  });
});
