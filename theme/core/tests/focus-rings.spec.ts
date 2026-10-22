import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as sass from 'sass';
import { describe, expect, it } from 'vitest';

/**
 * Focus is visible in every mode (WCAG 2.4.7 / 1.4.11, docs/packages/theme.md#focus-rings):
 * - a box-shadow ring (buttons) pairs with a transparent outline that forced-colors mode repaints
 *   (`focus-ring-shadow`), so Windows High Contrast still shows focus;
 * - text fields draw the standard 2px `--theme-focus-ring-color` outline and keep the resting
 *   `--theme-border-strong-color` border (focus never lowers the control's contrast);
 * - nothing in the theme removes an outline outright.
 */
const scssRoot = join(import.meta.dirname, '../scss');
const compile = (source: string) =>
  sass.compileString(source, {
    loadPaths: [scssRoot],
    style: 'expanded',
    silenceDeprecations: ['slash-div', 'import'],
  }).css;

/** Every rule block whose selector matches `selector`, flattened to `selector { body }` text. */
function blocks(css: string, selector: RegExp): string[] {
  const out: string[] = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (selector.test(match[1])) out.push(`${match[1].trim()} {${match[2]}}`);
  }
  return out;
}

function scssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '_archive' ? [] : scssFiles(path);
    return name.endsWith('.scss') ? [path] : [];
  });
}

/** Declarations that remove an outline: `none` / `hidden` style, or a zero width, in any shorthand order. */
const zero = (token: string) => /^0(?:\.0*)?(?:px|r?em)?$/.test(token);
const REMOVES_OUTLINE = {
  outline: (value: string) => value.split(/\s+/).some((t) => t === 'none' || t === 'hidden' || zero(t)),
  'outline-style': (value: string) => value === 'none' || value === 'hidden',
  'outline-width': (value: string) => zero(value),
};

describe('theme focus rings', () => {
  const css = compile("@use 'globals/button'; @use 'globals/form'; @use 'globals/primevue-union';");

  it('button focus keeps the 3px ring and adds a transparent outline forced colours repaint', () => {
    // The base rules (variants such as `.btn--glass` only restyle the shadow; the outline cascades).
    // `.p-button` focus is PrimeVue's own outline (`semantic.focusRing` in src/primevue.ts).
    const base = blocks(css, /(^|,)\s*(button:not\(\.p-button\)|\.btn|\.p-button):focus-visible\s*(,|$)/).filter((b) =>
      b.includes('box-shadow')
    );
    expect(base.some((b) => b.startsWith('button:not(.p-button)'))).toBe(true);
    for (const block of base) {
      expect(block, block).toContain('outline: 2px solid transparent');
      expect(block, block).toMatch(/box-shadow: 0 0 0 3px var\(--theme-focus-ring-color\)/);
    }
    for (const block of blocks(css, /:focus/)) expect(block, block).not.toMatch(/outline: (none|0)/);
    expect(css).toMatch(/@media \(forced-colors: active\)\s*\{[^}]*:focus-visible[^{]*\{\s*outline-color: Highlight;/);
  });

  it('text fields draw the standard ring and keep the resting border on focus', () => {
    const fields = blocks(css, /(input|textarea|select|\.p-inputtext|\.p-textarea)[^,{]*:focus(-visible)?\b/).filter(
      (b) => !/button|\.btn|input\[type=file\]/.test(b.slice(0, b.indexOf('{')))
    );
    const ringed = fields.filter((b) => b.includes('outline:'));
    expect(ringed.length).toBeGreaterThan(0);
    // Each of these selectors carries the ring itself (not only some field rule).
    const ringFor = (selector: RegExp) => ringed.filter((b) => selector.test(b.slice(0, b.indexOf('{'))));
    for (const selector of [
      /(^|,)\s*input:focus-visible\s*(,|$)/m,
      /(^|,)\s*textarea:focus-visible\s*(,|$)/m,
      /\.p-inputtext:enabled:focus\s*(,|$)/m,
      /\.p-select:not\(\.p-disabled\)\.p-focus/,
    ])
      expect(ringFor(selector).length, String(selector)).toBeGreaterThan(0);
    for (const block of ringed) {
      expect(block, block).toContain('outline: 2px solid var(--theme-focus-ring-color)');
      expect(block, block).toContain('outline-offset: 2px');
      expect(block, block).toContain('border-color: var(--theme-border-strong-color)');
      expect(block, block).not.toMatch(/color-mix\([^)]*focus-ring-color[^)]*\d+%/);
    }
  });

  it('no theme sheet removes an outline (any spelling, !important included)', () => {
    const offenders = scssFiles(scssRoot).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/(?:^|[;{\s])(outline(?:-style|-width)?)\s*:\s*([^;}]*)/g)]
        .filter(([, prop, raw]) =>
          REMOVES_OUTLINE[prop as keyof typeof REMOVES_OUTLINE](raw.replace(/!important/, '').trim())
        )
        .map(([decl]) => `${relative(scssRoot, file)}: ${decl.trim()}`)
    );
    expect(offenders).toEqual([]);
  });

  it('the outline-removal check catches every spelling', () => {
    const removes = (decl: string) => {
      const [, prop, raw] = /^(outline(?:-style|-width)?)\s*:\s*(.*)$/.exec(decl)!;
      return REMOVES_OUTLINE[prop as keyof typeof REMOVES_OUTLINE](raw.replace(/!important/, '').trim());
    };
    for (const decl of [
      'outline: none',
      'outline: 0',
      'outline: 0 none',
      'outline: none !important',
      'outline-style: none',
      'outline-width: 0',
      'outline-width: 0px !important',
    ])
      expect(removes(decl), decl).toBe(true);
    for (const decl of [
      'outline: 2px solid transparent',
      'outline: 2px solid var(--theme-focus-ring-color)',
      'outline-width: 2px',
      'outline-style: solid',
    ])
      expect(removes(decl), decl).toBe(false);
  });

  it('exposes focus-ring / focus-ring-shadow to Vue SFCs (nuxt-auto) and standalone sheets (tokens)', () => {
    const viaAuto = compile("@use 'nuxt-auto' as *; .a:focus-visible { @include focus-ring(-2px); }");
    expect(viaAuto).toMatch(/outline: 2px solid var\(--theme-focus-ring-color\);\s*outline-offset: -2px;/);
    const viaTokens = compile("@use 'tokens' as *; .b:focus-visible { @include focus-ring-shadow(0 0 0 3px red); }");
    expect(viaTokens).toContain('outline: 2px solid transparent');
    expect(viaTokens).toMatch(/@media \(forced-colors: active\)/);
  });
});
