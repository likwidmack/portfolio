/**
 * Shared colour-system guard engine (R-T6b): the page / component rules from Task 5
 * (`core/web/tests/colors-scss.spec.ts`) factored out so `core/admin/tests/colors-scss.spec.ts`
 * can apply the same rules to `core/admin/app` without copy-pasting the engine.
 *
 * Rules enforced (spec rule 5 / Task 5 & 6):
 *   1. no colour literal — hex / `rgb()` / `hsl()` / modern colour functions / Sass `$` or `#{}`
 *      anywhere in a style value, CSS named colours on colour-bearing properties (masks, filters,
 *      SVG stops included), no top-level Sass colour `$x: …` and no `$x` passed to `@include`;
 *      in inline styles (`style="…"` and `:style` object / array literals) no literal or named
 *      colour either; elsewhere in templates and scripts, no hex / colour-function string except
 *      the data occurrences listed in the caller's data-literal allowlist;
 *   2. no custom property set inline (`:style="{ '--x': … }"`, `style['--x'] = …`) — custom
 *      properties are declared in SCSS — and no colour-valued custom property declared anywhere;
 *   3. every colour `var()` names a DECLARED colour custom property or an owner-kept palette name
 *      (R-T5b); old names (theme rename map, old `--portfolio-*` names), typos and ad-hoc names are
 *      refused.
 *
 * A caller supplies its own declared-name set, palette / non-colour-name sets and data-literal
 * allowlist (each package's own colours and documented data literals); the matching engine below is
 * shared verbatim.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** CSS Color 4 named colours (`transparent` and `currentcolor` are allowed and listed separately). */
export const NAMED_COLORS = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown ' +
    'burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan ' +
    'darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred ' +
    'darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink ' +
    'deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold ' +
    'goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush ' +
    'lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey ' +
    'lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime ' +
    'limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen ' +
    'mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin ' +
    'navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise ' +
    'palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue ' +
    'saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow ' +
    'springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'
  ).split(' ')
);
export const COLOR_KEYWORDS = new Set(['transparent', 'currentcolor', ...NAMED_COLORS]);
export const COLOR_FUNCTION = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i;
export const SASS_COLOR = /#\{[^}]*(?:\$|lighten|darken|mix|alpha|color)/i;

/**
 * Colour-bearing properties in pages / components (masks paint with a colour's alpha). Shared by
 * `core/web` and `core/admin` — neither package's set of colour-bearing CSS properties differs.
 */
export const DEFAULT_COLOR_PROPERTY_PATTERN =
  /^(?:color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-start|-end)?)?(?:-color)?|outline(?:-color)?|box-shadow|text-shadow|fill|stroke|text-decoration(?:-color)?|caret-color|accent-color|column-rule(?:-color)?|scrollbar-color|(?:-webkit-)?mask(?:-image)?|filter|-webkit-text-fill-color|-webkit-tap-highlight-color|stop-color|flood-color|border-image)$/;

export type Declaration = { file: string; name: string; value: string; selector?: string };

/** The selector (or at-rule prelude) of the block enclosing position `at` in `text`. */
function enclosingSelector(text: string, at: number): string {
  let depth = 0;
  for (let i = at; i >= 0; i--) {
    const ch = text[i];
    if (ch === '}') depth++;
    else if (ch === '{') {
      if (depth === 0) {
        const before = text.slice(0, i);
        const start = Math.max(before.lastIndexOf(';'), before.lastIndexOf('{'), before.lastIndexOf('}'));
        return before.slice(start + 1).trim();
      }
      depth--;
    }
  }
  return '';
}

export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Split on top-level whitespace / commas (outside parens and `#{}`). */
export function topLevelParts(value: string, separator: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(' || ch === '{') depth++;
    else if (ch === ')' || ch === '}') depth--;
    if (depth === 0 && separator.test(ch)) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function varArgs(expr: string): { name: string; fallback: string | null } | null {
  const m = /^var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,([\s\S]*))?\)$/.exec(expr.trim());
  return m ? { name: m[1]!, fallback: m[2]?.trim() ?? null } : null;
}

/**
 * Colour literals in a value: hex, `rgb()` / `hsl()` (and `-a`), the modern colour functions
 * (`oklch()`, `oklab()`, `lab()`, `lch()`, `hwb()`, `color()` — `color-mix()` of variables stays
 * allowed), Sass `$` / `#{…}`, CSS named colours.
 */
export function literalColorProblems(value: string): string[] {
  const problems: string[] = [];
  if (/#[0-9a-f]{3,8}\b/i.test(value.replace(/#\{[^}]*\}/g, ''))) problems.push('hex literal');
  if (/\b(?:rgba?|hsla?)\(/i.test(value)) problems.push('rgb()/hsl()');
  if (/(?<![\w-])(?:oklch|oklab|lab|lch|hwb|color)\(/i.test(value)) problems.push('colour function');
  if (value.includes('$') || value.includes('#{')) problems.push('Sass value');
  const words = value
    .replace(/(['"])[\s\S]*?\1/g, ' ')
    .replace(/--[\w-]+/g, ' ')
    .replace(/[a-z-]+\(/gi, ' ')
    .match(/[a-z]+/gi);
  const named = (words ?? []).filter((w) => NAMED_COLORS.has(w.toLowerCase()));
  if (named.length) problems.push(`named colour ${[...new Set(named)].join(', ')}`);
  return problems;
}

export type GuardOptions = {
  /** Old theme colour names → new `--theme-*-color` names (theme's `color-rename-map.json`). */
  themeRenames: Record<string, string>;
  /** Old `--portfolio-*` colour names → new `--portfolio-*-color` names (may be empty for a package with none). */
  portfolioRenames: Record<string, string>;
  /** Owner-kept palette names (R-T5b), e.g. `--red-color`. */
  paletteNames: Set<string>;
  /** Theme names that are not colours (shadow lists, gradients, RGB triplets) — allowed anywhere. */
  nonColorThemeNames: Set<string>;
  /** Every declared `--theme-*-color` / `--portfolio-*-color` name the package may reference. */
  declaredColorNames: Set<string>;
  /** Non-colour custom properties that may appear in colour-bearing values (border-radius tokens …). */
  nonColorVarPattern: RegExp;
  /** Colour-bearing properties scanned for literals (masks paint with a colour's alpha). */
  colorPropertyPattern: RegExp;
  /** Hex / colour strings in templates and scripts that are DATA, not styling (R-T5c). */
  dataLiterals: Record<string, { count: number; reason: string }>;
  /** Path suffixes (`/`-separated) excluded from the walk, e.g. an owner-kept file left untouched. */
  excludeFiles?: string[];
};

export type AppSource = { file: string; styles: string[]; template: string; scripts: string[] };

export function vueBlocks(source: string, tag: 'style' | 'template' | 'script'): string[] {
  // `<template>` may nest; the outermost block runs to the LAST closing tag.
  if (tag === 'template') {
    const open = /<template\b[^>]*>/.exec(source);
    const close = source.lastIndexOf('</template>');
    return open && close > open.index ? [source.slice(open.index + open[0].length, close)] : [];
  }
  return [...source.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1]!);
}

export function walk(dir: string, exclude: string[] = []): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path, exclude);
    if (!/\.(?:vue|scss)$/.test(entry.name)) return [];
    const normalized = path.replace(/\\/g, '/');
    if (exclude.some((suffix) => normalized === suffix || normalized.endsWith(`/${suffix}`))) return [];
    return [path];
  });
}

export function readAppSources(appDir: string, exclude: string[] = []): AppSource[] {
  return walk(appDir, exclude)
    .map((path) => path.slice(appDir.length + 1).replace(/\\/g, '/'))
    .map((file) => {
      const source = readFileSync(join(appDir, file), 'utf8');
      if (file.endsWith('.scss')) return { file, styles: [source], template: '', scripts: [] };
      return {
        file,
        styles: vueBlocks(source, 'style'),
        template: vueBlocks(source, 'template').join('\n'),
        scripts: vueBlocks(source, 'script'),
      };
    });
}

/** Every `name: value` declaration (custom or not) in a style source; selectors are skipped. */
function allStyleDeclarations(file: string, source: string): Declaration[] {
  const text = stripComments(source);
  const out: Declaration[] = [];
  const start = /(?:^|[;{}])\s*(-?-?[a-zA-Z][a-zA-Z0-9-]*)\s*:(?!:)/gm;
  let match: RegExpExecArray | null;
  while ((match = start.exec(text)) !== null) {
    let depth = 0;
    let end = match.index + match[0].length;
    for (; end < text.length; end++) {
      const ch = text[end];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === '#' && text[end + 1] === '{') {
        end = text.indexOf('}', end);
        if (end < 0) end = text.length;
      } else if ((ch === ';' || ch === '{' || ch === '}') && depth === 0) break;
    }
    const value = text.slice(match.index + match[0].length, end).trim();
    if (value && text[end] !== '{')
      out.push({ file, name: match[1]!, value, selector: enclosingSelector(text, match.index) });
    start.lastIndex = end;
  }
  return out;
}

/**
 * Inline style values in a template: static `style="…"` text, and the string literals inside a
 * `:style` / `v-bind:style` object or array literal (a binding to a name is not a literal).
 */
function inlineStyleValues(template: string): string[] {
  const out: string[] = [];
  for (const m of template.matchAll(/(?<![\w:-])(v-bind:|:)?style=(["'])([\s\S]*?)\2/g)) {
    const value = m[3]!;
    if (!m[1]) {
      out.push(value);
      continue;
    }
    if (!/^\s*[{[]/.test(value)) continue;
    for (const lit of value.matchAll(/(['"`])((?:(?!\1)[\s\S])*)\1/g)) out.push(lit[2]!.replace(/\$\{[^}]*\}/g, ' '));
  }
  return out;
}

export function varRefs(value: string): string[] {
  // A name built in a template literal (`var(--theme-${role}-color)`) is not a static reference.
  return [...value.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)(?![\w$-])/g)].map((m) => m[1]!);
}

/**
 * The 3:1 main variations: built to reach 3:1 on paper — fills, borders and graphics (WCAG
 * 1.4.11), too faint for words (1.4.3 needs 4.5:1). Text uses an `-ink` role instead
 * (`--theme-primary-ink-color`, `--theme-secondary-ink-color`, `--theme-<status>-ink-color`).
 */
export const MAIN_VARIATION_NAMES: ReadonlySet<string> = new Set([
  '--theme-primary-color',
  '--theme-secondary-color',
  '--theme-accent-color',
]);
/** Properties that paint text. */
export const TEXT_COLOR_PROPERTY = /^(?:color|-webkit-text-fill-color)$/;
/** SVG text paints with `fill:` — counted as text when the rule targets `text` or a `…label` element. */
export const SVG_TEXT_SELECTOR = /(?:^|[\s>+~,(])text\b|label\b/;

/**
 * Text declarations (`color:` / `-webkit-text-fill-color:`, and `fill:` in a rule for SVG `text` or a
 * `…label`) that read a 3:1 main variation — the
 * value itself, a `var()` fallback or a `color-mix()` argument. `key` is
 * `<file> <property>: <value>` (whitespace collapsed) for an allowlist; `message` explains it.
 */
export function mainVariationTextProblems(file: string, source: string): Array<{ key: string; message: string }> {
  return allStyleDeclarations(file, source)
    .filter(
      ({ name, selector }) =>
        TEXT_COLOR_PROPERTY.test(name) || (name === 'fill' && SVG_TEXT_SELECTOR.test(selector ?? ''))
    )
    .flatMap(({ name, value }) => {
      const hits = [...new Set(varRefs(value).filter((ref) => MAIN_VARIATION_NAMES.has(ref)))];
      if (!hits.length) return [];
      const key = `${file} ${name}: ${value.replace(/\s+/g, ' ')}`;
      return [{ key, message: `${key} (${hits.join(', ')} is a 3:1 main variation — text uses an -ink role)` }];
    });
}

export function createColorGuard(options: GuardOptions) {
  const { themeRenames, portfolioRenames, paletteNames, nonColorThemeNames, declaredColorNames } = options;
  const themeOldNames = new Set(Object.keys(themeRenames));

  function isColorName(name: string): boolean {
    return name.endsWith('-color') || name in portfolioRenames || themeOldNames.has(name);
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

  function isAllowedColorVar(name: string): boolean {
    if (paletteNames.has(name)) return true;
    return /^--(?:theme|portfolio)-[a-z0-9-]+-color$/.test(name) && declaredColorNames.has(name);
  }

  /** A problem with one `var(--name` reference, or null when it is fine. */
  function varRefProblem(name: string, inColorValue: boolean): string | null {
    if (name in portfolioRenames) return `old name ${name} → ${portfolioRenames[name]}`;
    if (themeOldNames.has(name)) return `old name ${name} → ${themeRenames[name]}`;
    if (isAllowedColorVar(name) || nonColorThemeNames.has(name) || options.nonColorVarPattern.test(name)) return null;
    if (/^--(?:theme|portfolio)-[a-z0-9-]+-color$/.test(name)) return `undeclared colour name: ${name}`;
    if (name.endsWith('-color') || inColorValue) return `not a colour variable: ${name}`;
    return null;
  }

  /** Problems in a style source (rules 1–3). */
  function appStyleProblems(file: string, source: string): string[] {
    const out: string[] = [];
    const text = stripComments(source);
    for (const m of text.matchAll(/^\s*\$([\w-]+)\s*:\s*([^;]+);/gm)) {
      const value = m[2]!.trim();
      if (isColorValue(value) || literalColorProblems(value).some((p) => p !== 'Sass value'))
        out.push(`${file} $${m[1]}: ${value} (Sass colour variable)`);
    }
    for (const m of text.matchAll(/@include\s+([\w-]+)\s*\(([^)]*\$[^)]*)\)/g))
      out.push(`${file} @include ${m[1]}(${m[2]!.trim()}) (Sass value passed to a mixin)`);
    for (const { name, value } of allStyleDeclarations(file, source)) {
      const custom = name.startsWith('--');
      const colorProp = !custom && options.colorPropertyPattern.test(name);
      const literal = literalColorProblems(value).filter((p) => colorProp || custom || !p.startsWith('named colour'));
      if (literal.length) out.push(`${file} ${name}: ${value} (${literal.join('; ')})`);
      if (custom && (isColorName(name) || isColorValue(value)))
        out.push(`${file} ${name}: ${value} (declares a colour variable)`);
      for (const ref of varRefs(value)) {
        const problem = varRefProblem(ref, colorProp || (custom && isColorValue(value)));
        if (problem) out.push(`${file} ${name}: ${value} (${problem})`);
      }
    }
    return out;
  }

  /** Problems in a template or script block (literals, inline custom properties, var names). */
  function appCodeProblems(file: string, code: string, counts: Map<string, number>, template = false): string[] {
    const out: string[] = [];
    const text = code.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    if (template)
      for (const value of inlineStyleValues(text)) {
        const problems = literalColorProblems(value).filter((p) => p !== 'Sass value');
        if (problems.length) out.push(`${file} inline style "${value.trim()}" (${problems.join('; ')})`);
      }
    for (const m of text.matchAll(
      /#[0-9a-fA-F]{3,8}\b|(?<![\w-])(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\([^)]*\)/g
    )) {
      const key = `${file} ${m[0]}`;
      if (key in options.dataLiterals) counts.set(key, (counts.get(key) ?? 0) + 1);
      else out.push(`${key} (colour literal in template / script)`);
    }
    for (const m of text.matchAll(/['"`](--[a-zA-Z0-9-]+)['"`]\s*\]?\s*(?::|=(?!=))/g))
      out.push(`${file} ${m[1]} (custom property set from an inline style — declare it in SCSS)`);
    for (const ref of varRefs(text)) {
      const problem = varRefProblem(ref, true);
      if (problem) out.push(`${file} var(${ref}) (${problem})`);
    }
    return out;
  }

  return { isColorName, isColorValue, isAllowedColorVar, varRefProblem, appStyleProblems, appCodeProblems };
}
