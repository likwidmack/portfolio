import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Text roles guard for the theme layer (brand small-text contrast, WCAG 1.4.3) — the theme-side
 * twin of `mainVariationTextProblems` in `core/web/tests/support/colors-scss-guard.ts`.
 *
 * The main variations `--theme-{primary,secondary,accent}-color` (and their Foundation bridge names
 * `--foundation-{primary,secondary,accent}`) reach only 3:1 on paper: fills, borders, graphics
 * (1.4.11). Text — `color:` / `-webkit-text-fill-color:` — uses an `-ink` role
 * (`--theme-primary-ink-color`, `--theme-secondary-ink-color`, `--theme-<status>-ink-color`) or the
 * text / link roles.
 *
 * Scans `scss/globals` and `scss/layers` (not `_archive`). Sass nested properties
 * (`background: { color: … }`) resolve to their real name (`background-color`), so they are not text.
 */

const themeRoot = join(import.meta.dirname, '..');

const MAIN_VARIATION_REFS: ReadonlySet<string> = new Set([
  '--theme-primary-color',
  '--theme-secondary-color',
  '--theme-accent-color',
  '--foundation-primary',
  '--foundation-secondary',
  '--foundation-accent',
]);
const TEXT_PROPERTY = /^(?:color|-webkit-text-fill-color)$/;

type SourceDecl = { name: string; value: string };

/**
 * Every declaration in a SCSS source with its resolved property name: a Sass nested-property
 * block (`background: { color: x; }`) yields `background-color`. Comments and `#{…}` are handled;
 * selectors and at-rule preludes are skipped.
 */
function scssDeclarations(source: string): SourceDecl[] {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const out: SourceDecl[] = [];
  const prefixes: Array<string | null> = [];
  let segment = '';
  let parens = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '#' && text[i + 1] === '{') {
      const end = text.indexOf('}', i);
      segment += text.slice(i, end + 1);
      i = end;
      continue;
    }
    if (ch === '(') parens++;
    else if (ch === ')') parens--;
    if (parens > 0 || (ch !== ';' && ch !== '{' && ch !== '}')) {
      segment += ch;
      continue;
    }
    const piece = segment.trim();
    segment = '';
    if (ch === '{') {
      const nested = /^([a-z-]+)\s*:\s*$/.exec(piece);
      prefixes.push(nested ? nested[1]! : null);
      continue;
    }
    const prefix = [...prefixes].reverse().find((p) => p !== null) ?? null;
    const decl = /^(-?-?[a-zA-Z][\w-]*)\s*:(?!:)\s*([\s\S]+)$/.exec(piece);
    if (decl && !piece.startsWith('@') && !piece.startsWith('$')) {
      const direct = prefixes.length && prefixes[prefixes.length - 1] !== null;
      out.push({ name: direct && prefix ? `${prefix}-${decl[1]}` : decl[1]!, value: decl[2]!.replace(/\s+/g, ' ') });
    }
    if (ch === '}') prefixes.pop();
  }
  return out;
}

/** Text declarations reading a 3:1 main variation; key `<file> <prop>: <value>`. */
function mainVariationTextKeys(file: string, source: string): string[] {
  return scssDeclarations(source)
    .filter(({ name }) => TEXT_PROPERTY.test(name))
    .filter(({ value }) => [...value.matchAll(/var\(\s*(--[\w-]+)/g)].some((m) => MAIN_VARIATION_REFS.has(m[1]!)))
    .map(({ name, value }) => `${file} ${name}: ${value}`);
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '_archive' ? [] : walk(path);
    return entry.name.endsWith('.scss') ? [path] : [];
  });
}

/**
 * Deliberate exceptions, keyed `<file> <prop>: <value>`; `count` is the exact number of
 * occurrences. Empty: the secondary-as-text sites moved to `--theme-secondary-ink-color` and `time`
 * to `--theme-text-secondary-color` — a new entry needs a reason and must not be text below 4.5:1.
 */
const MAIN_VARIATION_TEXT_ALLOWLIST: Record<string, { count: number; reason: string }> = {};

const sources = [...walk(join(themeRoot, 'scss', 'globals')), ...walk(join(themeRoot, 'scss', 'layers'))].map(
  (path) => ({
    file: relative(themeRoot, path).replace(/\\/g, '/'),
    source: readFileSync(path, 'utf8'),
  })
);

describe('theme text never paints a 3:1 main variation', () => {
  it('scans globals and layers (the PrimeVue v3 Sass theme is archived)', () => {
    expect(sources.some((s) => s.file.endsWith('globals/_primevue-union.scss'))).toBe(true);
    expect(sources.some((s) => s.file.endsWith('contents/_foundation-runtime.scss'))).toBe(true);
    expect(sources.some((s) => s.file.includes('primevue/themes/'))).toBe(false);
    expect(sources.some((s) => s.file.includes('_archive'))).toBe(false);
  });

  it('uses -ink / text roles for color and -webkit-text-fill-color, except the counted allowlist', () => {
    const counts = new Map<string, number>();
    for (const { file, source } of sources)
      for (const key of mainVariationTextKeys(file, source)) counts.set(key, (counts.get(key) ?? 0) + 1);
    const offenders = [...counts.keys()].filter((key) => !(key in MAIN_VARIATION_TEXT_ALLOWLIST));
    expect(offenders).toEqual([]);
    expect(
      Object.entries(MAIN_VARIATION_TEXT_ALLOWLIST)
        .filter(([key, { count }]) => counts.get(key) !== count)
        .map(([key, { count }]) => `${key}: listed ${count}, found ${counts.get(key) ?? 0}`)
    ).toEqual([]);
  });

  it('self-test: catches direct, fallback, color-mix, Foundation bridge, nested selector and text-fill', () => {
    const keys = (css: string) => mainVariationTextKeys('x.scss', css);
    expect(keys('.a { color: var(--theme-primary-color); }')).toEqual(['x.scss color: var(--theme-primary-color)']);
    expect(keys('.a { color: var(--theme-link-color, var(--theme-primary-color)); }')).toHaveLength(1);
    expect(keys('.a { color: var(--foundation-primary, var(--theme-primary-ink-color)); }')).toHaveLength(1);
    expect(keys('.a { &:hover { color: var(--theme-accent-color); } }')).toHaveLength(1);
    expect(keys('.a { -webkit-text-fill-color: var(--theme-secondary-color); }')).toHaveLength(1);
    expect(
      keys('.a { color: color-mix(in srgb, var(--theme-primary-color) 26%, var(--theme-text-color)); }')
    ).toHaveLength(1);
    expect(keys('.a {\n  color:\n    var(--theme-primary-color);\n}')).toHaveLength(1);
    expect(keys('@include x { .a { color: var(--theme-primary-color); } }')).toHaveLength(1);
  });

  it('self-test: fills, borders, nested background properties and ink roles pass', () => {
    const keys = (css: string) => mainVariationTextKeys('x.scss', css);
    expect(keys('.a { color: var(--theme-primary-ink-color); }')).toEqual([]);
    expect(keys('.a { color: var(--theme-secondary-ink-color); }')).toEqual([]);
    expect(
      keys('.a { color: color-mix(in srgb, var(--theme-secondary-ink-color) 45%, var(--theme-text-color)); }')
    ).toEqual([]);
    expect(keys('.a { background: { color: var(--theme-secondary-color); size: 100%; } }')).toEqual([]);
    expect(keys('.a { border: { width: 1px; color: var(--theme-primary-color); } }')).toEqual([]);
    expect(
      keys(
        '.a { background-color: var(--theme-primary-color); border-color: var(--theme-primary-color); ' +
          'text-decoration-color: var(--theme-primary-color); accent-color: var(--theme-primary-color); }'
      )
    ).toEqual([]);
    expect(keys('$x: var(--theme-primary-color);')).toEqual([]);
    expect(keys('.a { color: #{$c}; }')).toEqual([]);
    // Nested-property resolution: `background: { color }` is background-color, a nested rule is not.
    expect(scssDeclarations('.a { background: { color: red; } .b { color: blue; } }')).toEqual([
      { name: 'background-color', value: 'red' },
      { name: 'color', value: 'blue' },
    ]);
  });
});
