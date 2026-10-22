/**
 * Build `src/colors.json` from Sass color dump + catalog sources.
 *
 * Sources:
 * - scss/export/colors-dump.scss — dart-sass compile of resolvable color `$` tokens
 * - colors_2.json / extended-colors.json — named catalogs (fill; Sass wins on conflict)
 *
 * Conflict rule: Sass-resolved values win over catalog values.
 *
 * `cssVariables` is keyed by the colour system's `--theme-…-color` names only (colour system
 * Task 8, R-T8c); `src/tokens.ts` mirrors it. `tests/colors-json-drift.spec.ts` rebuilds the
 * inventory in memory ({@link buildColorsInventory}) and fails when the committed file drifts.
 *
 *   npm run build:colors --workspace=@tgmc/theme
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as sass from 'sass';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const scssRoot = join(root, 'scss');
const dumpPath = join(scssRoot, 'export', 'colors-dump.scss');

const catalog = JSON.parse(readFileSync(join(src, 'colors_2.json'), 'utf8'));
const extended = JSON.parse(readFileSync(join(src, 'extended-colors.json'), 'utf8'));

function kebabToCamel(name) {
  return String(name).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function toHexByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, '0');
}

/**
 * Stabilize dart-sass modern `rgb(…%)` / legacy `rgb(r,g,b)` to `#rrggbb` when opaque.
 * Leave `color-mix`, named colors, and alpha colors unchanged.
 */
function normalizeCssColor(value) {
  const v = String(value).trim();
  const modern = /^rgba?\(\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(v);
  if (modern) {
    const a = modern[4] == null ? 1 : Number(modern[4]);
    if (a < 1) return v;
    const r = (Number(modern[1]) / 100) * 255;
    const g = (Number(modern[2]) / 100) * 255;
    const b = (Number(modern[3]) / 100) * 255;
    return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
  }
  const legacy = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(v);
  if (legacy) {
    const a = legacy[4] == null ? 1 : Number(legacy[4]);
    if (a < 1) return v;
    return `#${toHexByte(Number(legacy[1]))}${toHexByte(Number(legacy[2]))}${toHexByte(Number(legacy[3]))}`;
  }
  return v;
}

function hexFromNamedEntry(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') {
    if (typeof entry.hex === 'string') return entry.hex;
    if (typeof entry.css === 'string' && entry.css.startsWith('#')) return entry.css;
  }
  return null;
}

/** Compile colors-dump.scss → map of kebab token name → CSS color string. */
function compileSassDump() {
  const result = sass.compile(dumpPath, {
    loadPaths: [scssRoot],
    style: 'expanded',
  });
  const map = {};
  for (const match of result.css.matchAll(/--tv-([\w-]+)\s*:\s*([^;]+);/gi)) {
    const key = match[1];
    const value = normalizeCssColor(match[2].trim());
    if (key && value) map[key] = value;
  }
  if (Object.keys(map).length < 50) {
    throw new Error(`Sass color dump produced too few tokens (${Object.keys(map).length})`);
  }
  return map;
}

function requireDump(dump, kebabKey) {
  const value = dump[kebabKey];
  if (value == null || value === '') {
    throw new Error(`Missing Sass dump token "--tv-${kebabKey}" (routed inventory key)`);
  }
  return value;
}

/**
 * Route dump tokens into the structured colors.json shape expected by tokens.ts.
 * Keys are dump kebab names (without `--tv-` prefix).
 */
function buildStructuredFromDump(dump) {
  const g = (key) => requireDump(dump, key);

  const base = {
    white: g('color-white'),
    black: g('color-black'),
    grayLt: g('color-gray-lt'),
    grayMd: g('color-gray-md'),
    grayDk: g('color-gray-dk'),
    blue: g('color-blue'),
    red: g('color-red'),
    green: g('color-green'),
    magenta: g('color-magenta'),
    cyan: g('color-cyan'),
    yellow: g('color-yellow'),
    defaultWhite: g('default-white'),
    defaultBlack: g('default-black'),
  };

  const palettes = {
    brightSkySunset: {
      pastelBlue: g('pastel-blue'),
      pastelPink: g('pastel-pink'),
      softWhite: g('soft-white'),
    },
    darkNightGoldenDay: {
      blackPearl: g('black-pearl'),
      darkTarawera: g('dark-tarawera'),
      thanksgivingOrange: g('thanksgiving-orange'),
      wattleYellow: g('wattle-yellow'),
    },
    pastelDayNight: {
      skyBlue: g('sky-blue'),
      paleYellow: g('pale-yellow'),
      softOrange: g('soft-orange'),
      mutedMagenta: g('muted-magenta'),
      deepIndigo: g('deep-indigo'),
    },
    midnightMagic: {
      darkAmethyst: g('dark-amethyst'),
      deepPurple: g('deep-purple'),
      midnightViolet: g('midnight-violet'),
      midnightVioletDk: g('midnight-violet-dk'),
    },
  };

  const semantic = {
    success: g('route-semantic-success'),
    warning: g('route-semantic-warning'),
    alert: g('route-semantic-alert'),
    error: g('route-semantic-error'),
    info: g('route-semantic-info'),
  };

  const theme = {
    light: {
      text: g('route-theme-light-text'),
      background: g('route-theme-light-background'),
      backgroundSecondary: g('route-theme-light-background-secondary'),
      primary: g('route-theme-light-primary'),
      secondary: g('route-theme-light-secondary'),
    },
    dark: {
      text: g('route-theme-dark-text'),
      background: g('route-theme-dark-background'),
      backgroundSecondary: g('route-theme-dark-background-secondary'),
      primary: g('route-theme-dark-primary'),
      secondary: g('route-theme-dark-secondary'),
    },
  };

  // The routed `--theme-…-color` roles the JS mirrors read (`src/tokens.ts`).
  const cssVariables = {
    dark: {
      '--theme-primary-hover-color': g('route-css-dark-primary-hover'),
      '--theme-text-secondary-color': g('route-css-dark-text-secondary-color'),
      '--theme-surface-color': g('route-css-dark-surface-color'),
      '--theme-surface-variant-color': g('route-css-dark-surface-variant'),
      '--theme-border-color': g('route-css-dark-border-color'),
      '--theme-accent-color': g('route-css-dark-accent-color'),
      '--theme-info-hue-color': g('route-css-dark-info'),
      '--theme-form-background-color': g('route-css-dark-form-background'),
      '--theme-form-background-disabled-color': g('route-css-dark-form-background-disabled'),
      '--theme-form-placeholder-color': g('route-css-dark-form-placeholder'),
      '--theme-form-invalid-color': g('route-css-dark-form-invalid-color'),
      '--theme-focus-ring-color': g('route-css-dark-focus-ring'),
      '--theme-link-color': g('route-css-dark-link-color'),
      '--theme-border-strong-color': g('route-css-dark-border-strong'),
      '--theme-primary-fill-color': g('route-css-dark-primary-fill'),
      '--theme-on-primary-color': g('route-css-dark-on-primary'),
      '--theme-success-ink-color': g('route-css-dark-success-ink'),
      '--theme-warning-ink-color': g('route-css-dark-warning-ink'),
      '--theme-error-ink-color': g('route-css-dark-error-ink'),
      '--theme-info-ink-color': g('route-css-dark-info-ink'),
      '--theme-paper-color': g('route-css-dark-paper'),
      '--theme-ink-color': g('route-css-dark-ink'),
    },
    light: {
      '--theme-primary-hover-color': g('route-css-light-primary-hover'),
      '--theme-text-secondary-color': g('route-css-light-text-secondary-color'),
      '--theme-surface-color': g('route-css-light-surface-color'),
      '--theme-surface-variant-color': g('route-css-light-surface-variant'),
      '--theme-border-color': g('route-css-light-border-color'),
      '--theme-accent-color': g('route-css-light-accent-color'),
      '--theme-success-hue-color': g('route-css-light-success'),
      '--theme-warning-hue-color': g('route-css-light-warning'),
      '--theme-error-hue-color': g('route-css-light-error'),
      '--theme-form-background-color': g('route-css-light-form-background'),
      '--theme-form-background-disabled-color': g('route-css-light-form-background-disabled'),
      '--theme-form-placeholder-color': g('route-css-light-form-placeholder'),
      '--theme-form-invalid-color': g('route-css-light-form-invalid-color'),
      '--theme-focus-ring-color': g('route-css-light-focus-ring'),
      '--theme-link-color': g('route-css-light-link-color'),
      '--theme-border-strong-color': g('route-css-light-border-strong'),
      '--theme-primary-fill-color': g('route-css-light-primary-fill'),
      '--theme-on-primary-color': g('route-css-light-on-primary'),
      '--theme-success-ink-color': g('route-css-light-success-ink'),
      '--theme-warning-ink-color': g('route-css-light-warning-ink'),
      '--theme-error-ink-color': g('route-css-light-error-ink'),
      '--theme-info-ink-color': g('route-css-light-info-ink'),
      '--theme-paper-color': g('route-css-light-paper'),
      '--theme-ink-color': g('route-css-light-ink'),
    },
  };

  const primary = {
    default: g('route-primary-default'),
    secondary: g('route-primary-secondary'),
    success: g('route-primary-success'),
    warning: g('route-primary-warning'),
    alert: g('route-primary-alert'),
    error: g('route-primary-error'),
    info: g('route-primary-info'),
  };

  return { base, palettes, semantic, theme, cssVariables, primary };
}

/** Flat camelCase map of all non-route dump colors. */
function buildSassFlat(dump) {
  const sassFlat = {};
  for (const [kebab, value] of Object.entries(dump)) {
    if (kebab.startsWith('route-')) continue;
    sassFlat[kebabToCamel(kebab)] = value;
  }
  return sassFlat;
}

function buildNamedMap(sassFlat, structured) {
  const named = {};

  for (const [key, entry] of Object.entries(catalog.named ?? {})) {
    const hex = hexFromNamedEntry(entry);
    if (hex) named[kebabToCamel(key)] = hex;
  }

  for (const [key, entry] of Object.entries(extended)) {
    const hex = hexFromNamedEntry(entry);
    if (!hex) continue;
    named[kebabToCamel(key)] = hex;
  }

  // Wide Sass dump wins over catalogs.
  Object.assign(named, sassFlat);

  // Palette / base aliases for Color.named callers.
  named.midnightVioletDark = structured.palettes.midnightMagic.midnightVioletDk;
  named.midnightVioletDk = structured.palettes.midnightMagic.midnightVioletDk;
  named.white = structured.base.white;
  named.black = structured.base.black;

  return named;
}

function buildBase(structured) {
  const common = catalog.common ?? {};
  return {
    ...structured.base,
    ...Object.fromEntries(
      Object.entries(common)
        .filter(
          ([k]) =>
            ![
              'white',
              'black',
              'defaultWhite',
              'defaultBlack',
              'grayLight',
              'grayMedium',
              'grayDark',
              'blue',
              'red',
              'green',
              'magenta',
              'cyan',
              'yellow',
            ].includes(k)
        )
        .map(([k, v]) => [kebabToCamel(k), v])
    ),
  };
}

function buildPalettes(structured) {
  const theme = catalog.theme ?? {};
  const packs = { ...structured.palettes };
  for (const [packName, swatches] of Object.entries(theme)) {
    if (packName === 'light' || packName === 'dark') continue;
    if (typeof swatches !== 'object' || !swatches) continue;
    const camelPack = kebabToCamel(packName);
    const fromCatalog = {};
    for (const [swatch, value] of Object.entries(swatches)) {
      let key = kebabToCamel(swatch);
      if (key === 'midnightVioletDark') key = 'midnightVioletDk';
      fromCatalog[key] = value;
    }
    packs[camelPack] = { ...fromCatalog, ...(structured.palettes[camelPack] ?? {}) };
  }
  return packs;
}

function buildPrimary(structured) {
  return { ...(catalog.primary ?? {}), ...structured.primary };
}

function buildPlugin(structured) {
  const plugin = structuredClone(catalog.plugin ?? {});
  if (plugin.status) {
    plugin.status = {
      ...plugin.status,
      success: structured.semantic.success,
      warning: structured.semantic.warning,
      danger: structured.semantic.error,
      info: structured.semantic.info,
    };
  }
  return plugin;
}

/** The whole `colors.json` inventory (compiles the Sass dump; writes nothing). */
export function buildColorsInventory() {
  const dump = compileSassDump();
  const structured = buildStructuredFromDump(dump);
  const sassFlat = buildSassFlat(dump);
  return {
    $schemaComment:
      'Generated by bin/build-colors-json.mjs from Sass colors-dump + colors_2/extended-colors; Sass wins on conflict.',
    base: buildBase(structured),
    palettes: buildPalettes(structured),
    semantic: structured.semantic,
    theme: structured.theme,
    cssVariables: structured.cssVariables,
    primary: buildPrimary(structured),
    plugin: buildPlugin(structured),
    sass: sassFlat,
    named: buildNamedMap(sassFlat, structured),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const inventory = buildColorsInventory();
  const outPath = join(src, 'colors.json');
  writeFileSync(outPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
  console.log(
    `Wrote ${outPath} (${Object.keys(inventory.named).length} named, ${Object.keys(inventory.sass).length} sass, ${Object.keys(inventory.palettes).length} palettes)`
  );
}
