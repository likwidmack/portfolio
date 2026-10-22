/**
 * Tiny CSS reader for compiled theme stylesheets: splits a stylesheet into rules (with their
 * enclosing at-rule preludes) and each rule into custom-property declarations. Enough for the
 * flat `:root` output dart-sass emits — no nesting beyond at-rules, no string escapes.
 */
import { join } from 'node:path';
import * as sass from 'sass';

export type CssRule = { at: string[]; selector: string; decls: Array<[name: string, value: string]> };

const themeRoot = join(import.meta.dirname, '../..');

/** Compile `scss/globals/_root.scss` the way the colour dump does (expanded, no deprecation noise). */
export function compileRootCss(): string {
  return sass.compile(join(themeRoot, 'scss/globals/_root.scss'), {
    loadPaths: [join(themeRoot, 'scss')],
    style: 'expanded',
    silenceDeprecations: ['slash-div'],
  }).css;
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Split on `sep` at paren depth 0. */
function splitTop(body: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === sep && depth === 0) {
      out.push(body.slice(start, i));
      start = i + 1;
    }
  }
  out.push(body.slice(start));
  return out;
}

function matchBrace(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return i;
  }
  throw new Error('Unbalanced braces in compiled CSS');
}

export function parseRules(css: string, at: string[] = []): CssRule[] {
  const src = stripComments(css);
  const rules: CssRule[] = [];
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('{', i);
    if (open === -1) break;
    // Drop statement at-rules ending in `;` before the block (`@charset "UTF-8";`).
    const raw = src.slice(i, open);
    const prelude = raw.slice(raw.lastIndexOf(';') + 1).trim();
    const close = matchBrace(src, open);
    const body = src.slice(open + 1, close);
    if (prelude.startsWith('@')) {
      rules.push(...parseRules(body, [...at, prelude.replace(/\s+/g, ' ')]));
    } else {
      const decls: Array<[string, string]> = [];
      for (const part of splitTop(body, ';')) {
        const colon = part.indexOf(':');
        if (colon === -1) continue;
        const name = part.slice(0, colon).trim();
        if (!name.startsWith('--')) continue;
        decls.push([
          name,
          part
            .slice(colon + 1)
            .trim()
            .replace(/\s+/g, ' '),
        ]);
      }
      rules.push({ at, selector: prelude.replace(/\s+/g, ' '), decls });
    }
    i = close + 1;
  }
  return rules;
}

/** `var(--x)` / `var(--x, fallback)` references in a value. */
export function varRefs(value: string): string[] {
  return [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]!);
}

/** CSS colour keywords the theme could plausibly use (CSS named colours + system keywords). */
export const COLOUR_KEYWORDS: ReadonlySet<string> = new Set([
  'transparent',
  'currentcolor',
  'white',
  'black',
  'red',
  'orange',
  'yellow',
  'lime',
  'green',
  'teal',
  'cyan',
  'aqua',
  'blue',
  'navy',
  'purple',
  'magenta',
  'fuchsia',
  'pink',
  'maroon',
  'olive',
  'silver',
  'gray',
  'grey',
  'dimgray',
  'dimgrey',
  'darkgray',
  'darkgrey',
  'lightgray',
  'lightgrey',
  'gold',
  'coral',
  'tomato',
  'crimson',
  'indigo',
  'violet',
  'ivory',
  'beige',
  'tan',
  'brown',
  'canvas',
  'canvastext',
]);

const COLOUR_FUNCTION =
  /^(#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|hwb\(|lab\(|lch\(|oklab\(|oklch\(|color\(|color-mix\(|light-dark\()/i;

/**
 * Classifies a custom-property value as a colour: a colour literal / function / keyword, or a
 * `var(--x[, fallback])` whose reference is a known colour name (`isKnownColourName`), resolves
 * (via `lookup`) to a colour, or whose fallback is a colour.
 */
export function makeColourClassifier(
  lookup: (name: string) => string[],
  isKnownColourName: (name: string) => boolean
): (value: string) => boolean {
  const isColour = (value: string, seen: Set<string>): boolean => {
    const v = value.trim();
    if (COLOUR_FUNCTION.test(v) || COLOUR_KEYWORDS.has(v.toLowerCase())) return true;
    const ref = /^var\(\s*(--[\w-]+)\s*(?:,([\s\S]*))?\)$/.exec(v);
    if (!ref) return false;
    const [, name, fallback] = ref as unknown as [string, string, string | undefined];
    if (fallback !== undefined && fallback.trim() !== '' && isColour(fallback, seen)) return true;
    if (isKnownColourName(name)) return true;
    if (seen.has(name)) return false;
    seen.add(name);
    return lookup(name).some((decl) => isColour(decl, seen));
  };
  return (value) => isColour(value, new Set());
}
