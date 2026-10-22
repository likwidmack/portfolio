import { describe, expect, it } from 'vitest';

import { COLOR_RENAME_MAP } from '../src/color-rename';
import {
  buildButtonInkTokens,
  buildButtonStopTokens,
  buildColorVariations,
  buildLinkTokens,
  buildPrimaryFillTokens,
  buildPrimaryInkTokens,
  buildSecondaryInkTokens,
  buildStatusInkTokens,
  buildWashTokens,
  DEFAULT_COLOR_SOURCES,
} from '../src/color-variations';
import { DEFAULT_PAPER_INK } from '../src/paper-ink';
import { compileRootCss, parseRules } from './helpers/css-decls.js';

/**
 * Colour-system rule 3 guard (spec `docs/superpowers/specs/2026-09-24-color-system-design.md`):
 * every colour-valued custom property the theme root emits is a `var()` / `color-mix()` of
 * declared variations — never a literal or a Sass hex — except the explicit allowlist below.
 */
const decls = parseRules(compileRootCss()).flatMap((r) => r.decls.map(([name, value]) => ({ name, value })));
const declared = new Set(decls.map((d) => d.name));

const variations = buildColorVariations(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK);
const primaryInk = buildPrimaryInkTokens(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK);
const GENERATED = new Set(
  Object.keys({
    ...variations,
    ...buildButtonInkTokens(variations),
    ...buildPrimaryFillTokens(variations),
    ...primaryInk,
    ...buildSecondaryInkTokens(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK),
    ...buildStatusInkTokens(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK),
    ...buildWashTokens(variations, primaryInk, DEFAULT_PAPER_INK),
    ...buildLinkTokens(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK),
    ...buildButtonStopTokens(variations),
  })
);

/** Names allowed to hold a literal colour, each with its reason. */
const ALLOWLIST: Array<{ reason: string; test: (name: string) => boolean }> = [
  {
    reason:
      'The solid colours’ per-mode defaults: the generated variations (`_variations.generated.scss`) the runtime overrides — the sources of every other colour.',
    test: (name) => GENERATED.has(name),
  },
  {
    reason: 'Palette data the owner kept (`paletteNames`, `palette` in the rename map): hue scales, not roles.',
    test: (name) => COLOR_RENAME_MAP.paletteNames.includes(name) || COLOR_RENAME_MAP.palette.includes(name),
  },
  {
    reason:
      'Syntax-palette channels (`globals/_syntax.scss`): the code-highlighting palette is data on an always-dark code pane.',
    test: (name) => name === '--rgb-accent-soft',
  },
  {
    reason:
      'Third-party interfaces (Foundation `--foundation-*`, PrimeVue `--p-*`): names kept; their values are `var()`s of theme roles (color-naming.spec.ts checks them).',
    test: (name) => /^--(foundation|p)-/.test(name),
  },
];

/** External hooks a colour value may read without the theme declaring them. */
const EXTERNAL_HOOKS = new Set(['--background-color', '--background-color-secondary', '--background-color-accent']);

const LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|\b(?:white|black)\b/i;
const COLOUR_VALUED =
  /var\(--[a-z0-9-]*(?:color|-default|-light-dark)\b|color-mix\(|light-dark\(|#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;
const isColourValued = (name: string, value: string) =>
  name.endsWith('-color') || name.startsWith('--rgb-') || COLOUR_VALUED.test(value);

describe('rule 3: every colour is a named variation of the solid colours', () => {
  it('emits colour-valued custom properties to check (sanity)', () => {
    expect(decls.filter((d) => isColourValued(d.name, d.value)).length).toBeGreaterThan(200);
  });

  it('no colour-valued custom property holds a literal or Sass hex, outside the allowlist', () => {
    const offenders = decls
      .filter((d) => isColourValued(d.name, d.value))
      .filter((d) => !ALLOWLIST.some((a) => a.test(d.name)))
      .filter((d) => LITERAL.test(d.value.replace(/var\([^()]*\)/g, '')) || /^\d+ \d+ \d+$/.test(d.value.trim()))
      .map((d) => `${d.name}: ${d.value}`);
    expect(offenders).toEqual([]);
  });

  it('every var() a colour value reads is declared by the theme (or is a documented external hook)', () => {
    const missing = new Set<string>();
    for (const d of decls.filter((x) => isColourValued(x.name, x.value)))
      for (const [, ref] of d.value.matchAll(/var\((--[a-z0-9-]+)/gi))
        if (!declared.has(ref!) && !EXTERNAL_HOOKS.has(ref!) && !/^--portfolio-/.test(ref!))
          missing.add(`${d.name} → ${ref}`);
    expect([...missing]).toEqual([]);
  });

  it('the allowlisted literals are only the generated defaults, palette data and syntax channels', () => {
    const literal = decls.filter((d) => isColourValued(d.name, d.value) && LITERAL.test(d.value));
    for (const d of literal)
      expect(
        ALLOWLIST.some((a) => a.test(d.name)),
        `${d.name}: ${d.value}`
      ).toBe(true);
    // Every generated name is emitted, so a builder change without a stylesheet change fails here.
    for (const name of GENERATED) expect(declared.has(name), name).toBe(true);
  });

  it('retired roles are gone from the stylesheet (archived in scss/_archive/2026-10-05-derived-roles/)', () => {
    for (const name of [
      '--theme-primary-action-color',
      '--theme-main-secondary-color',
      '--theme-main-background-accent-color',
      '--theme-teal-signal-color',
      '--theme-default-white-color',
      '--theme-default-black-color',
      '--theme-default-grey-color',
      '--theme-button-border-color',
      '--foundation-white',
      '--foundation-black',
      '--rgb-white',
      '--rgb-neon',
      '--rgb-shadow',
      '--rgb-shadow-alt',
    ])
      expect(declared.has(name), name).toBe(false);
  });
});
