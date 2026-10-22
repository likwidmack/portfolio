// @vitest-environment node

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as sass from 'sass';
import { describe, expect, it } from 'vitest';

import { PORTFOLIO_COLOR_RENAMES } from '../shared/portfolio-color-names';
import { RUNTIME_COLOR_TOKEN_NAMES } from '../shared/preferences/paint';

import {
  COLOR_FUNCTION,
  COLOR_KEYWORDS,
  createColorGuard,
  DEFAULT_COLOR_PROPERTY_PATTERN,
  literalColorProblems,
  mainVariationTextProblems,
  readAppSources,
  SASS_COLOR,
  stripComments,
  topLevelParts,
  varArgs,
} from './support/colors-scss-guard';

/**
 * Colour-system guard for the app-global layer (`core/web/assets/css/*.scss`, spec rules 4 and 6):
 * every colour-valued custom property is a `--portfolio-…-color` blend of theme / app colour
 * variables. The old names are gone (aliases removed in colour system Task 8, R-T8a).
 *
 * A declaration is colour-valued when its name ends in `-color`, or its whole value is ONE colour
 * expression: a hex literal, a colour function (`rgb()`, `hsl()`, `color-mix()`, `oklab()` …), a
 * colour keyword, a Sass interpolation of a colour (`#{$…}` / `#{theme-lighten(…)}` …), or a
 * `var()` of a colour name (a `-color` name, an old name in the theme or app rename maps). Values
 * made of several parts (shadows, gradients, font stacks, lengths, keywords such as `cover`) are
 * not classified as colours — but (fix round 1) the literal checks below run on EVERY `--portfolio-*`
 * value and on every colour-bearing property (`color`, `background*`, `border*`, `outline*`,
 * `box-shadow`, `fill`, `stroke`, `text-decoration*`, `caret-color`), so a colour literal inside a
 * shadow, gradient or Sass interpolation is still caught.
 *
 * Literal = a hex value, `rgb()` / `rgba()` / `hsl()` / `hsla()`, a Sass `$` / `#{…}`, or a CSS named
 * colour (the full CSS Color 4 keyword list; `transparent` and `currentcolor` stay allowed).
 */

const cssDir = join(import.meta.dirname, '..', 'assets', 'css');
const repoRoot = join(import.meta.dirname, '..', '..', '..');
const themeRenames = (
  JSON.parse(readFileSync(join(repoRoot, 'theme', 'core', 'src', 'color-rename-map.json'), 'utf8')) as {
    renames: Record<string, string>;
  }
).renames;

/** Old theme colour names (`--accent-color`, `--text-color`, `--main-background`, `--ink` …). */
const THEME_OLD_COLOR_NAMES = new Set(Object.keys(themeRenames));
/** Colour-bearing properties scanned for literals in the app-global sheets. */
const COLOR_PROPERTY =
  /^(?:color|background(?:-[a-z-]+)?|border(?:-[a-z-]+)?|outline(?:-[a-z-]+)?|box-shadow|fill|stroke|text-decoration(?:-[a-z-]+)?|caret-color)$/;

// `literalColorProblems`, `stripComments`, `topLevelParts`, `varArgs`, `NAMED_COLORS` and
// `COLOR_KEYWORDS` live in `./support/colors-scss-guard` (R-T6b) — shared verbatim with
// `core/admin/tests/colors-scss.spec.ts`.
type Declaration = { file: string; name: string; value: string };

/** Every `--name: value;` in a SCSS source (values may span lines and contain `#{…}` / parens). */
function declarations(file: string, source: string): Declaration[] {
  const text = stripComments(source);
  const out: Declaration[] = [];
  const start = /(--[a-zA-Z0-9-]+)\s*:/g;
  let match: RegExpExecArray | null;
  while ((match = start.exec(text)) !== null) {
    let depth = 0;
    let end = match.index + match[0].length;
    for (; end < text.length; end++) {
      const ch = text[end];
      if (ch === '(' || ch === '{') depth++;
      else if (ch === ')' || ch === '}') {
        if (depth === 0) break;
        depth--;
      } else if (ch === ';' && depth === 0) break;
    }
    out.push({ file, name: match[1]!, value: text.slice(match.index + match[0].length, end).trim() });
    start.lastIndex = end;
  }
  return out;
}

function isColorName(name: string): boolean {
  return name.endsWith('-color') || name in PORTFOLIO_COLOR_RENAMES || THEME_OLD_COLOR_NAMES.has(name);
}

function isColorValue(value: string): boolean {
  const parts = topLevelParts(value, /\s/);
  if (parts.length !== 1) return false;
  const expr = parts[0]!;
  if (/^#[0-9a-f]{3,8}$/i.test(expr)) return true;
  if (COLOR_FUNCTION.test(expr)) return true;
  if (COLOR_KEYWORDS.has(expr.toLowerCase())) return true;
  if (SASS_COLOR.test(expr)) return true;
  const v = varArgs(expr);
  if (v) return isColorName(v.name) || (v.fallback !== null && isColorValue(v.fallback));
  return false;
}

/** A blend value: only theme / app colour variables, `color-mix()` of them, and `transparent`. */
function blendProblems(value: string): string[] {
  const problems = literalColorProblems(value);
  const check = (expr: string): void => {
    const e = expr.trim();
    if (e === 'transparent') return;
    const v = varArgs(e);
    if (v) {
      if (!/^--(?:theme|portfolio)-[a-z0-9-]+-color$/.test(v.name)) problems.push(`var(${v.name})`);
      if (v.fallback !== null) check(v.fallback);
      return;
    }
    const mix = /^color-mix\(\s*in\s+(?:srgb|oklab)\s*,([\s\S]*)\)$/i.exec(e);
    if (mix) {
      for (const arg of topLevelParts(mix[1]!, /,/)) check(arg.replace(/\s+\d+(?:\.\d+)?%$/, ''));
      return;
    }
    problems.push(`not a colour variable or blend: ${e}`);
  };
  if (!problems.length) check(value);
  return problems;
}

/** Ordinary (non-custom) colour-bearing property declarations: `color: …;`, `border: …;` … */
function propertyDeclarations(file: string, source: string): Declaration[] {
  const text = stripComments(source);
  const out: Declaration[] = [];
  const start = /(?:^|[;{])\s*([a-z][a-z-]*)\s*:(?!:)/gm;
  let match: RegExpExecArray | null;
  while ((match = start.exec(text)) !== null) {
    const name = match[1]!;
    let depth = 0;
    let end = match.index + match[0].length;
    for (; end < text.length; end++) {
      const ch = text[end];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if ((ch === ';' || ch === '{' || ch === '}') && depth === 0) break;
    }
    const value = text.slice(match.index + match[0].length, end).trim();
    // `a:hover {` / `&:focus-visible,` are selectors (they end at `{`), not declarations.
    if (COLOR_PROPERTY.test(name) && text[end] !== '{' && value) out.push({ file, name, value });
    start.lastIndex = end;
  }
  return out;
}

/**
 * Existing colour literals on ordinary properties, each with its reason (fix round 1). Key:
 * `<file> <property>: <value>` with whitespace collapsed.
 */
const PROPERTY_LITERAL_ALLOWLIST: Record<string, string> = {
  '_mixins.scss background: color-mix(in srgb, var(--theme-surface-color) #{$mix}, transparent)':
    '`$mix` is the mixin percentage parameter (a number, not a colour)',
  '_globals.scss background: color-mix(in srgb, var(--theme-main-background-color) 35%, black) !important':
    '.p-dialog-mask scrim darkens the page ground with black; a theme scrim colour is a later stage (TODO)',
};

const sheets = readdirSync(cssDir).filter((file) => file.endsWith('.scss'));
const allDeclarations = sheets.flatMap((file) => declarations(file, readFileSync(join(cssDir, file), 'utf8')));
const allProperties = sheets.flatMap((file) => propertyDeclarations(file, readFileSync(join(cssDir, file), 'utf8')));

describe('app-global colour variables (colour system)', () => {
  it('declares every colour-valued custom property as a --portfolio-*-color blend (no aliases)', () => {
    const colorDeclarations = allDeclarations.filter((d) => isColorName(d.name) || isColorValue(d.value));
    expect(colorDeclarations.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const { file, name, value } of colorDeclarations) {
      const next = PORTFOLIO_COLOR_RENAMES[name];
      if (next) {
        offenders.push(`${file} ${name}: ${value} (old name — use ${next})`);
        continue;
      }
      if (!/^--portfolio-[a-z0-9-]+-color$/.test(name)) {
        offenders.push(`${file} ${name}: ${value} (colour variables are --portfolio-*-color)`);
        continue;
      }
      const problems = blendProblems(value);
      if (problems.length) offenders.push(`${file} ${name}: ${value} (${problems.join('; ')})`);
    }
    expect(offenders).toEqual([]);
  });

  it('has no colour literal in any --portfolio-* value, colour-valued or not (shadows, images …)', () => {
    const offenders = allDeclarations
      .filter((d) => d.name.startsWith('--portfolio-') || isColorName(d.name) || isColorValue(d.value))
      .map((d) => ({ ...d, problems: literalColorProblems(d.value) }))
      .filter((d) => d.problems.length)
      .map((d) => `${d.file} ${d.name}: ${d.value} (${d.problems.join('; ')})`);
    expect(offenders).toEqual([]);
  });

  it('has no colour literal on colour-bearing properties, except the listed ones', () => {
    expect(allProperties.length).toBeGreaterThan(10);
    const seen = new Set<string>();
    const offenders: string[] = [];
    for (const { file, name, value } of allProperties) {
      const problems = literalColorProblems(value);
      if (!problems.length) continue;
      const key = `${file} ${name}: ${value.replace(/\s+/g, ' ')}`;
      if (key in PROPERTY_LITERAL_ALLOWLIST) seen.add(key);
      else offenders.push(`${key} (${problems.join('; ')})`);
    }
    expect(offenders).toEqual([]);
    // Stale allowlist entries fail too, so the list shrinks as literals go.
    expect(Object.keys(PROPERTY_LITERAL_ALLOWLIST).filter((key) => !seen.has(key))).toEqual([]);
  });

  it('flags every blind-spot shape (literals inside shadows, interpolations, named colours)', () => {
    for (const bad of [
      '0 0 10px #c00',
      '0 0 10px #{theme-add-alpha($oxblood-dark, 0.7)}',
      '#{$primary-color-dark}',
      '$accent-color',
      'rgba(0, 0, 0, 0.5)',
      '0 1px 2px rgb(10 20 30 / 50%)',
      'hsl(0 0% 0%)',
      'hsla(0, 0%, 0%, 0.2)',
      'red',
      '0 1px 2px rebeccapurple',
      'linear-gradient(to bottom, var(--theme-paper-color), Navy)',
      'color-mix(in srgb, var(--theme-ink-color) 20%, black)',
      '1px solid WhiteSmoke',
    ])
      expect(literalColorProblems(bad), bad).not.toEqual([]);
    for (const ok of [
      'var(--portfolio-teal-color)',
      'var(--portfolio-coral-color, var(--theme-accent-color))',
      'color-mix(in srgb, var(--theme-ink-color) 21%, transparent)',
      'currentcolor',
      'transparent',
      '0 0 10px color-mix(in srgb, var(--portfolio-rose-color) 70%, transparent)',
      '1px solid var(--portfolio-rule-color)',
      'clamp(3rem, 7vw, 7rem)',
      "'IBM Plex Sans', ui-sans-serif, Arial, sans-serif",
    ])
      expect(literalColorProblems(ok), ok).toEqual([]);
    // Multi-part values are not classified as colours, but the literal check still sees them.
    expect(isColorValue('0 0 10px #c00')).toBe(false);
    expect(isColorValue('rebeccapurple')).toBe(true);
    expect(isColorValue('var(--x, tomato)')).toBe(true);
    // A shadow on an ordinary property is scanned too.
    const [shadow] = propertyDeclarations(
      'x.scss',
      '.a {\n  box-shadow: 0 0 10px #c00;\n  &:hover {\n    color: red;\n  }\n}'
    );
    expect(shadow).toEqual({ file: 'x.scss', name: 'box-shadow', value: '0 0 10px #c00' });
    expect(propertyDeclarations('x.scss', 'a:hover {\n  color: red;\n}').map((d) => d.value)).toEqual(['red']);
  });

  it('old names are gone: no old --portfolio-* or theme colour name is declared or read (R-T8a)', () => {
    const old = new Set([...Object.keys(PORTFOLIO_COLOR_RENAMES), ...THEME_OLD_COLOR_NAMES]);
    expect(allDeclarations.filter((d) => old.has(d.name)).map((d) => `${d.file} ${d.name}`)).toEqual([]);
    const reads = [...allDeclarations, ...allProperties]
      .flatMap((d) => [...d.value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => [d, m[1]!] as const))
      .filter(([, ref]) => old.has(ref))
      .map(([d, ref]) => `${d.file} ${d.name} → ${ref}`);
    expect(reads).toEqual([]);
  });
});

// ------------------------------------------------------------------------------------------------
// Pages, layouts and components (`core/web/app`, spec rule 5 — colour-system Task 5).
//
// Every `.scss` file and every `.vue` style block, template and script block (except the
// unreferenced `components/AnalogClock.vue`, left alone by the owner):
//   1. no colour literal — hex / `rgb()` / `hsl()` / modern colour functions / Sass `$` or `#{}`
//      anywhere in a style value, CSS named colours on colour-bearing properties (masks, filters,
//      SVG stops included), no top-level Sass colour `$x: …` and no `$x` passed to `@include`;
//      in inline styles (`style="…"` and `:style` object / array literals) no literal or named
//      colour either; elsewhere in templates and scripts, no hex / colour-function string except
//      the data occurrences listed in APP_DATA_LITERALS;
//   2. no custom property set inline (`:style="{ '--x': … }"`, `style['--x'] = …`) — custom
//      properties are declared in SCSS — and no colour-valued custom property declared anywhere;
//   3. every colour `var()` names a DECLARED `--theme-*-color` / `--portfolio-*-color` (the
//      theme's compiled `_root.scss`, the web `_variables.scss`, the runtime-written names) or
//      an owner-kept palette name (`--red-color` …, R-T5b); old names (theme rename map, old
//      `--portfolio-*` names), typos and ad-hoc names are refused.
// ------------------------------------------------------------------------------------------------

const appDir = join(import.meta.dirname, '..', 'app');
const colorMap = JSON.parse(readFileSync(join(repoRoot, 'theme', 'core', 'src', 'color-rename-map.json'), 'utf8')) as {
  paletteNames: string[];
  palette: string[];
  excluded: Array<{ names: string[] }>;
};
/** Palette names the owner keeps as they are (R-T5b). */
const PALETTE_NAMES = new Set([...colorMap.paletteNames, ...colorMap.palette]);
/** Theme names that are not colours (shadow lists, gradients, RGB triplets) — allowed anywhere. */
const THEME_NON_COLOR_NAMES = new Set(colorMap.excluded.flatMap((group) => group.names));
/** App / theme custom properties that are not colours and may appear in colour-bearing values. */
const NON_COLOR_VAR =
  /^--(?:portfolio-(?:background-(?:image|repeat|size|position|attachment|blend-mode)|particle-shadow-strong)|border-radius-[a-z0-9-]+|button-radius|hairline|border-width)$/;

/**
 * Hex / colour strings in templates and scripts that are DATA, not styling (R-T5c): picker values,
 * contrast-maths fallbacks shown as text, documentation specimens. Key: `<file> <literal>`; `count`
 * is the exact number of occurrences, so a second (painted) use of the same literal fails.
 */
const APP_DATA_LITERALS: Record<string, { count: number; reason: string }> = {
  'components/AppStylesParity/index.vue #132440': {
    count: 2,
    reason: 'documentation specimen: the pickContrastingInk() inputs in the TypeScript code sample (text, not paint)',
  },
  'components/AppStylesParity/index.vue #285a48': {
    count: 1,
    reason: 'documentation specimen: the pickContrastingInk() gradient input in the same code sample (text, not paint)',
  },
  'components/ui/UiColorPicker.vue #000000': {
    count: 1,
    reason: 'picker value: the colour input needs a hex when the model is empty',
  },
};

function declaredNames(css: string): string[] {
  return [...css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((m) => m[1]!);
}

/**
 * Every colour name a page may reference: declared by the theme's compiled `:root`
 * (`globals/_root.scss`, both modes' names), declared in the web `_variables.scss`, or written at
 * runtime (`RUNTIME_COLOR_TOKEN_NAMES`, the Background → Custom fill).
 */
const DECLARED_COLOR_NAMES = new Set<string>([
  ...declaredNames(
    sass.compile(join(repoRoot, 'theme', 'core', 'scss', 'globals', '_root.scss'), {
      loadPaths: [join(repoRoot, 'theme', 'core'), join(repoRoot, 'theme', 'core', 'scss')],
      style: 'expanded',
      logger: sass.Logger.silent,
    }).css
  ),
  ...declaredNames(readFileSync(join(cssDir, '_variables.scss'), 'utf8')),
  ...RUNTIME_COLOR_TOKEN_NAMES,
  '--portfolio-depth-custom-color',
]);

// The generic matching engine (declarations, literals, var-name checks, .vue block extraction) is
// shared with `core/admin/tests/colors-scss.spec.ts` via `./support/colors-scss-guard` (R-T6b).
const guard = createColorGuard({
  themeRenames,
  portfolioRenames: PORTFOLIO_COLOR_RENAMES,
  paletteNames: PALETTE_NAMES,
  nonColorThemeNames: THEME_NON_COLOR_NAMES,
  declaredColorNames: DECLARED_COLOR_NAMES,
  nonColorVarPattern: NON_COLOR_VAR,
  colorPropertyPattern: DEFAULT_COLOR_PROPERTY_PATTERN,
  dataLiterals: APP_DATA_LITERALS,
});
const { appStyleProblems, appCodeProblems } = guard;
const appSources = readAppSources(appDir, ['components/AnalogClock.vue']);

describe('pages, layouts and components use colour variables only (core/web/app)', () => {
  it('has no colour literals, declares no colour variables and uses only --theme / --portfolio colour names', () => {
    expect(appSources.length).toBeGreaterThan(40);
    const counts = new Map<string, number>();
    const offenders = appSources.flatMap(({ file, styles, template, scripts }) => [
      ...styles.flatMap((style) => appStyleProblems(file, style)),
      ...appCodeProblems(file, template, counts, true),
      ...scripts.flatMap((code) => appCodeProblems(file, code, counts)),
    ]);
    expect(offenders).toEqual([]);
    // Each data literal occurs exactly as often as listed: a new (painted) use fails, and a stale
    // entry fails too, so the list shrinks when the data goes.
    expect(
      Object.entries(APP_DATA_LITERALS)
        .filter(([key, { count }]) => counts.get(key) !== count)
        .map(([key, { count }]) => `${key}: listed ${count}, found ${counts.get(key) ?? 0}`)
    ).toEqual([]);
  });

  it('catches the page / component shapes (masks, inline custom properties, old and ad-hoc names)', () => {
    const style = (css: string) => appStyleProblems('x.scss', css);
    expect(style('.a { mask-image: linear-gradient(to top, #000 0%, transparent 74%); }')).toHaveLength(1);
    expect(style('.a { color: var(--on-primary, #fff); }')).toHaveLength(2);
    expect(style('.a { color: white; }')).toHaveLength(1);
    expect(style('.a { white-space: nowrap; }')).toEqual([]);
    expect(style('.a { color: var(--text-color); }')).toEqual([
      'x.scss color: var(--text-color) (old name --text-color → --theme-text-color)',
    ]);
    expect(style('.a { color: var(--text-color-secondary, inherit); }')).toHaveLength(1);
    expect(style('.a { --x: var(--theme-ink-color); }')).toHaveLength(1);
    expect(style('.a { --work-card-media-width: 22.5rem; border-radius: var(--border-radius-md); }')).toEqual([]);
    expect(style('.a { background: var(--portfolio-rose-color); border-color: var(--red-color); }')).toEqual([]);
    expect(style('.a { box-shadow: var(--shadow-lg); background: var(--button-primary-bg); }')).toEqual([]);
    expect(style('.a { &:hover { color: var(--theme-link-color); } }')).toEqual([]);
    expect(style('.a { color: var(--portfolio-rose); }')).toHaveLength(1);
    // Modern colour functions, more colour properties, Sass variables, declared names.
    expect(style('.a { color: oklch(0.6 0.1 30); }')).toHaveLength(1);
    expect(style('.a { background: color(display-p3 1 0 0); }')).toHaveLength(1);
    expect(style('.a { background: color-mix(in oklab, var(--theme-ink-color) 20%, transparent); }')).toEqual([]);
    expect(style('.a { filter: drop-shadow(0 0 2px black); }')).toHaveLength(1);
    expect(style('.a { -webkit-tap-highlight-color: transparent; stop-color: white; }')).toHaveLength(1);
    expect(style('$ink: #111;\n.a { color: var(--theme-ink-color); }')).toHaveLength(1);
    expect(style('$gap: 1rem;')).toEqual([]);
    expect(style('.a { @include tint($brand); }')).toHaveLength(1);
    expect(style('.a { @include bp-down(mobile) { color: inherit; } }')).toEqual([]);
    expect(style('.a { color: var(--theme-primry-color); }')).toEqual([
      'x.scss color: var(--theme-primry-color) (undeclared colour name: --theme-primry-color)',
    ]);
    expect(style('.a { color: var(--theme-paper-dark-color); fill: var(--portfolio-depth-custom-color); }')).toEqual(
      []
    );
    const code = (js: string, template = false) => appCodeProblems('x.vue', js, new Map(), template);
    // Named colours in inline styles: static attributes and bound object / array literals only.
    expect(code('div(style="color: white")', true)).toHaveLength(1);
    expect(code(`span(:style="{ color: 'black' }")`, true)).toHaveLength(1);
    expect(code(`span(:style="[{ background: 'Navy' }, extra]")`, true)).toHaveLength(1);
    expect(code('i(:style="{ background: `${swatch.hex} !important` }")', true)).toEqual([]);
    expect(code('span(:style="surface.style") A red letter day', true)).toEqual([]);
    expect(code('p Pick a colour like red or black.', true)).toEqual([]);
    expect(code("const x = 'oklch(0.5 0.1 20)';")).toHaveLength(1);
    // A Pug class ending in a function name (`.ai-lab(…)`) is not a colour function.
    expect(code('.ai-lab(data-fit="screen")', true)).toEqual([]);
    expect(code(`span(:style="{ '--swatch': swatch.hex }")`)).toHaveLength(1);
    expect(code("style['--ui-image-bg'] = bg;")).toHaveLength(1);
    expect(code("const bg = 'var(--surface-color, var(--muted, #27272a))';")).toHaveLength(3);
    expect(code("const a = steps['--surface-color'];")).toEqual([]);
    expect(code("background: 'var(--theme-surface-color)'")).toEqual([]);
  });
});

// ------------------------------------------------------------------------------------------------
// Text uses an `-ink` role, never a 3:1 main variation (brand small-text contrast, WCAG 1.4.3).
// `--theme-{primary,secondary,accent}-color` are built to reach 3:1 on paper — right for fills,
// borders and graphics (1.4.11), too faint for words. Brand-coloured text is
// `--theme-primary-ink-color` / `--theme-secondary-ink-color` (≥ 4.5:1 on page, surface and
// variant). Mirrors the admin rule "no `-hue-color` for text".
// ------------------------------------------------------------------------------------------------

/**
 * Deliberate exceptions, keyed `<file> <property>: <value>` (whitespace collapsed); `count` is the
 * exact number of occurrences, so a second identical declaration fails (as APP_DATA_LITERALS).
 */
const MAIN_VARIATION_TEXT_ALLOWLIST: Record<string, { count: number; reason: string }> = {
  'components/AppArchitectureDiagram.vue color: color-mix(in srgb, var(--theme-primary-color) 70%, var(--theme-text-color))':
    {
      count: 1,
      reason: 'not text: `currentColor` for the edge strokes and arrowheads (graphics, WCAG 1.4.11 — 3:1)',
    },
};

describe('text never paints a 3:1 main variation (core/web/app + assets/css)', () => {
  const globalSheets = sheets.map((file) => ({ file, style: readFileSync(join(cssDir, file), 'utf8') }));

  it('uses -ink roles for color / -webkit-text-fill-color, except the listed ones', () => {
    const found = [
      ...appSources.flatMap(({ file, styles }) => styles.flatMap((style) => mainVariationTextProblems(file, style))),
      ...globalSheets.flatMap(({ file, style }) => mainVariationTextProblems(file, style)),
    ];
    const offenders = found.filter((p) => !(p.key in MAIN_VARIATION_TEXT_ALLOWLIST)).map((p) => p.message);
    expect(offenders).toEqual([]);
    const counts = new Map<string, number>();
    for (const { key } of found) counts.set(key, (counts.get(key) ?? 0) + 1);
    // Exactly the listed occurrences: a second identical declaration or a stale entry fails.
    expect(Object.fromEntries(counts)).toEqual(
      Object.fromEntries(Object.entries(MAIN_VARIATION_TEXT_ALLOWLIST).map(([key, { count }]) => [key, count]))
    );
  });

  it('catches every shape: direct, var() fallback, colour-mix, nested hover, text-fill; not fills', () => {
    const keys = (css: string) => mainVariationTextProblems('x.scss', css).map((p) => p.key);
    expect(keys('.a { color: var(--theme-primary-color); }')).toEqual(['x.scss color: var(--theme-primary-color)']);
    expect(keys('.a { color: var(--theme-link-color, var(--theme-primary-color)); }')).toHaveLength(1);
    expect(keys('.a { color: var(--portfolio-rose-color, var(--theme-accent-color)); }')).toHaveLength(1);
    expect(keys('.a { &:hover { color: var(--theme-secondary-color); } }')).toHaveLength(1);
    expect(keys('.a { -webkit-text-fill-color: var(--theme-primary-color); }')).toHaveLength(1);
    expect(
      keys('.a { color: color-mix(in srgb, var(--theme-primary-color) 70%, var(--theme-text-color)); }')
    ).toHaveLength(1);
    expect(keys('.a {\n  color:\n    var(--theme-primary-color);\n}')).toHaveLength(1);
    // Fine: ink roles, fills, borders, decoration, accent-color, the per-mode / fill names.
    expect(keys('.a { color: var(--theme-primary-ink-color); }')).toEqual([]);
    expect(keys('.a { color: var(--theme-link-color, var(--theme-primary-ink-color)); }')).toEqual([]);
    expect(
      keys(
        '.a { background: var(--theme-primary-color); border-color: var(--theme-primary-color); ' +
          'text-decoration-color: var(--theme-primary-color); accent-color: var(--theme-primary-color); ' +
          'outline: 2px solid var(--theme-accent-color); fill: var(--theme-primary-color); }'
      )
    ).toEqual([]);
    expect(keys('.a { color: var(--theme-primary-fill-color); }')).toEqual([]);
    expect(keys('.a { color: var(--theme-primary-dark-color); }')).toEqual([]);
    expect(keys('a:hover { color: var(--theme-primary-ink-color); }')).toEqual([]);
    expect(keys('.a { color: var(--theme-secondary-ink-color, var(--theme-primary-ink-color)); }')).toEqual([]);
    expect(keys('.d { &__group-label { fill: var(--theme-secondary-ink-color); } }')).toEqual([]);
    // SVG text paints with fill: counted in a `text` / `…label` rule, not on shapes.
    expect(keys('.d { &__group-label { fill: var(--theme-secondary-color); } }')).toHaveLength(1);
    expect(keys('svg text { fill: var(--theme-primary-color); }')).toHaveLength(1);
    expect(keys('.d { &__group { fill: color-mix(in srgb, var(--theme-primary-color) 8%, transparent); } }')).toEqual(
      []
    );
    expect(keys('.d__node-label { fill: var(--theme-text-color); }')).toEqual([]);
    // Two identical declarations are two occurrences (the allowlist counts them).
    expect(keys('.a { color: var(--theme-primary-color); } .b { color: var(--theme-primary-color); }')).toHaveLength(2);
  });
});
