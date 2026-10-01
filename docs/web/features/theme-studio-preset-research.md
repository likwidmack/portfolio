# Theme / Style Studio preset research

Primary-source notes on how `@tgmc/theme` defines Theme colour inputs, JSON palettes, Sass light/dark hue pairs, and how Style Studio applied brand packs when this note was written. Claims cite `file:line` ranges from the repo at research time.

Studio presets now live on `Theme.presets()` (`theme-presets.json`). Single colors, packs, and palettes share one derivation: primary from the source color (light/dark pair, or the palette’s lightest and darkest swatch), secondary from the analogous degree step, accent from the complement, and a background triad from extra swatches or those same roles. On apply, the brand triad is adjusted against paper and the background triad against ink. The sections below are a snapshot of the sources that catalog was built from, including the earlier “first three swatches” mapping.

Related living docs: [personalization.md](./personalization.md), [packages/theme.md](../../packages/theme.md).

---

## 1. ThemeDefinition colour inputs

`ThemeDefinition.colors` is the five-input model: **primary**, **secondary**, **accent**, **paper**, and **ink**. Deprecated surface/background overrides remain optional.

```62:85:theme/core/src/theme.ts
export type ThemeDefinition = {
  /** Full or partial CSS custom-property map. */
  tokens?: ThemeTokenMap;
  /**
   * The five colour inputs. Everything else derives from them in CSS: the neutral scale
   * (`--neutral-0…1000`, paper → ink), surfaces, text, borders and status tones.
   */
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    /** Background ("paper") for the active mode; the neutral scale runs paper → ink. */
    paper?: string;
    /** Foreground ("ink" / pen) for the active mode. */
    ink?: string;
    /** @deprecated Derived from paper / ink — set those instead. Still honoured as an override. */
    background?: string;
    /** @deprecated Derived from paper / ink. */
    backgroundSecondary?: string;
    /** @deprecated Derived from paper / ink. */
    surface?: string;
    /** @deprecated Derived from paper / ink. */
    surfaceVariant?: string;
  };
```

`definitionToTokens` maps those fields onto CSS variables (`--primary-color` / `--primary-default`, `--secondary-color`, `--accent-color` falling back to primary, `--paper`, `--ink`, plus deprecated backgrounds/surfaces). Button foreground is resolved from primary + secondary.

```131:155:theme/core/src/theme.ts
function definitionToTokens(definition: ThemeDefinition): ThemeTokenMap {
  const patch: ThemeTokenMap = {};
  // ...
  const { colors } = definition;
  if (colors) {
    if (colors.primary) {
      patch['--primary-color'] = colors.primary;
      patch['--primary-default'] = colors.primary;
      const secondary = colors.secondary ?? getToken('--secondary-color') ?? colors.primary;
      patch['--button-fg'] = resolveButtonForeground('dark', colors.primary, secondary);
    }
    if (colors.secondary) patch['--secondary-color'] = colors.secondary;
    if (colors.accent) patch['--accent-color'] = colors.accent;
    else if (colors.primary) patch['--accent-color'] = colors.primary;
    if (colors.paper) patch['--paper'] = colors.paper;
    if (colors.ink) patch['--ink'] = colors.ink;
    // deprecated background / surface overrides …
  }
```

Named JSON palettes are also registered on the Theme singleton via `paletteToTokens`, which again takes only the **first three** `Object.values` of each swatch map (primary / secondary / accent):

```116:129:theme/core/src/theme.ts
function paletteToTokens(swatches: Record<string, string>): ThemeTokenMap {
  const values = Object.values(swatches);
  const primary = values[0] ?? '#000000';
  const secondary = values[1] ?? primary;
  const accent = values[2] ?? primary;
  return {
    '--primary-color': primary,
    '--primary-default': primary,
    '--secondary-color': secondary,
    '--accent-color': accent,
    // `--focus-ring` stays the theme's contrast role (≥ 3:1) — a brand primary may not pass.
    '--button-fg': resolveButtonForeground('dark', primary, secondary),
  };
}
```

```193:199:theme/core/src/theme.ts
function seedBuiltins(): void {
  packs.set(BUILTIN_LIGHT, withoutDerivedRoles(lightCssVariables) as ThemeTokenMap);
  packs.set(BUILTIN_DARK, withoutDerivedRoles(darkCssVariables) as ThemeTokenMap);
  for (const [name, swatches] of Object.entries(palettes)) {
    packs.set(name, paletteToTokens(swatches as Record<string, string>));
  }
}
```

---

## 2. Palette packs currently map only the first three swatches

Style Studio / Personalize build `BRAND_PACKS` from theme `palettes` + Sass Light/Dark pairs. For **palette** packs, every swatch hex is kept on `swatches`, but role application uses at most three:

```189:203:core/web/shared/personalization.ts
function palettePacks(): BrandPack[] {
  return Object.entries(palettes).map(([id, swatchMap]) => {
    const swatches = Object.values(swatchMap).map((hex) => Color.toHex(hex));
    const primary = swatches[0] ?? Color.toHex(themeColors.dark.primary);
    const secondary = swatches[1] ?? primary;
    return {
      id,
      kind: 'palette',
      label: labelFromKey(id),
      color: primary,
      swatches,
      primary: { light: primary, dark: primary },
      secondary: { light: secondary, dark: secondary },
    };
  });
}
```

```292:312:core/web/shared/personalization.ts
/**
 * Palette packs apply the first three swatches. Single colors use the light or dark hex for `mode`
 * and derive secondary and accent from that primary.
 */
export function brandRolesFromPack(packId: BrandPackId, mode: ThemeResolvedMode = 'dark'): BrandRolesState {
  const pack = BRAND_PACKS.find((item) => item.id === packId);
  if (!pack) return defaultBrandRoles(mode);
  if (pack.kind === 'color') {
    const primary = mode === 'light' ? pack.primary.light : pack.primary.dark;
    return resolveBrandRolesState(primary);
  }
  const [primary, secondary = primary, accent] = pack.swatches;
  if (!accent) {
    return resolveBrandRolesState(primary, { secondary, secondaryLocked: true });
  }
  return resolveBrandRolesState(primary, {
    secondary,
    accent,
    secondaryLocked: true,
    accentLocked: true,
  });
}
```

Implications:

| Swatch index | Role               | When missing                                                                  |
| ------------ | ------------------ | ----------------------------------------------------------------------------- |
| `[0]`        | primary            | pack falls through to `defaultBrandRoles` only if pack id unknown             |
| `[1]`        | secondary (locked) | defaults to primary                                                           |
| `[2]`        | accent (locked)    | secondary locked from `[1]`; accent **derived** via `Color.resolveBrandRoles` |
| `[3+]`       | unused for roles   | still shown as chip swatches in Style Studio                                  |

`BRAND_PACKS` concatenates palette packs then single-colour packs:

```247:251:core/web/shared/personalization.ts
/**
 * Packs and single colors from theme `colors.json` (via `@tgmc/theme`).
 * Palettes are multi-swatch groups. Single colors are Light/Dark pairs and follow the active mode.
 */
export const BRAND_PACKS: BrandPack[] = [...palettePacks(), ...singleColorPacks()];
```

---

## 3. Palette collections with more than three colours (and hexes)

Source: `theme/core/src/colors.json` → `palettes` (`18:43:theme/core/src/colors.json`).

| Palette id           | Swatch count | Hexes (object insertion order = pack order)                                         |
| -------------------- | -----------: | ----------------------------------------------------------------------------------- |
| `brightSkySunset`    |        **3** | `#c8e8fc`, `#ffecf0`, `#ffdee4` — first three only; no unused 4th                   |
| `darkNightGoldenDay` |        **4** | `#001a26`, `#053752`, `#ef810e`, **`#e5de44` unused as a brand role**               |
| `pastelDayNight`     |        **5** | `#6696ba`, `#e2e38b`, `#e7a553`, **`#7e4b68`**, **`#292965` unused as brand roles** |
| `midnightMagic`      |        **4** | `#3a015c`, `#4f0147`, `#35012c`, **`#11001c` unused as a brand role**               |

Full object:

```18:43:theme/core/src/colors.json
  "palettes": {
    "brightSkySunset": {
      "pastelBlue": "#c8e8fc",
      "pastelPink": "#ffecf0",
      "softWhite": "#ffdee4"
    },
    "darkNightGoldenDay": {
      "blackPearl": "#001a26",
      "darkTarawera": "#053752",
      "thanksgivingOrange": "#ef810e",
      "wattleYellow": "#e5de44"
    },
    "pastelDayNight": {
      "skyBlue": "#6696ba",
      "paleYellow": "#e2e38b",
      "softOrange": "#e7a553",
      "mutedMagenta": "#7e4b68",
      "deepIndigo": "#292965"
    },
    "midnightMagic": {
      "darkAmethyst": "#3a015c",
      "deepPurple": "#4f0147",
      "midnightViolet": "#35012c",
      "midnightVioletDk": "#11001c"
    }
  },
```

---

## 4. Single colours with distinct Light and Dark hexes

`singleColorPacks()` scans `sassColors` for keys ending in `Light` / `Dark`, keeps stems that pass `isSingleColorStem` (CSS hue stems `css*` excluding role-like names, and lowercase hue-scale names excluding role stems), and requires **both** light and dark.

```206:244:core/web/shared/personalization.ts
const ROLE_STEMS = new Set(['primary', 'secondary', 'accent', 'text', 'success', 'warning', 'alert', 'error', 'info']);
const CSS_ROLE = /^(surface|primary|border|link|text|background|focus)/i;
// ...
function isSingleColorStem(stem: string): boolean {
  if (/^css[A-Z][a-z]+$/.test(stem)) return !CSS_ROLE.test(stem.slice(3));
  return /^[a-z]+$/.test(stem) && !ROLE_STEMS.has(stem);
}
/** Single hues that have both a Light and a Dark hex in theme `colors.json` `sass`. */
function singleColorPacks(): BrandPack[] {
  // … pairs Light+Dark → BrandPack kind: 'color', id `color${Stem}` …
}
```

### CSS hue pairs (`css*Light` / `css*Dark`)

All pairs below have **distinct** light vs dark hexes (`420:439:theme/core/src/colors.json`):

| Stem → pack id                | Light     | Dark      |
| ----------------------------- | --------- | --------- |
| `cssRed` → `colorRed`         | `#dc2626` | `#f87171` |
| `cssOrange` → `colorOrange`   | `#ea580c` | `#fb923c` |
| `cssAmber` → `colorAmber`     | `#d97706` | `#fbbf24` |
| `cssYellow` → `colorYellow`   | `#ca8a04` | `#facc15` |
| `cssLime` → `colorLime`       | `#65a30d` | `#a3e635` |
| `cssGreen` → `colorGreen`     | `#16a34a` | `#4ade80` |
| `cssTeal` → `colorTeal`       | `#0d9488` | `#2dd4bf` |
| `cssBlue` → `colorBlue`       | `#2563eb` | `#60a5fa` |
| `cssPurple` → `colorPurple`   | `#9333ea` | `#c084fc` |
| `cssMagenta` → `colorMagenta` | `#c026d3` | `#e879f9` |

### Hue-scale names (forest, oxblood, violet, wine, sea, olive, taupe)

All have distinct Light/Dark (`443:466:theme/core/src/colors.json`). `*Default` keys exist but are **not** used by `singleColorPacks` (only `*Light` / `*Dark`):

| Stem → pack id             | Light     | Dark      | Default (not a pack role) |
| -------------------------- | --------- | --------- | ------------------------- |
| `forest` → `colorForest`   | `#285a48` | `#408a71` | `#16a34a`                 |
| `oxblood` → `colorOxblood` | `#360a14` | `#9e2a3a` | `#dc2626`                 |
| `violet` → `colorViolet`   | `#211832` | `#5c3e94` | `#9333ea`                 |
| `wine` → `colorWine`       | `#4a0404` | `#822659` | `#c026d3`                 |
| `sea` → `colorSea`         | `#15292b` | `#5a9690` | `#0d9488`                 |
| `olive` → `colorOlive`     | `#1b211a` | `#8bae66` | `#65a30d`                 |
| `taupe` → `colorTaupe`     | `#3a2525` | `#d2c1b6` | `#d97706`                 |

### Incomplete or excluded Light/Dark keys (not brand packs)

Examples near the same Sass block that do **not** become `kind: 'color'` packs:

- Incomplete pairs: `navyLight` without `navyDark`; `azureDark` without `azureLight`; `plumLight` / `tangerineDark`; `inkLight` / `parchmentDark` (`440:469:theme/core/src/colors.json`).
- Role / token stems filtered out: `primaryColor*`, `secondaryColor*`, `accentColor*`, `textColor*`, `success*` / `warning*` / …, and `cssSurface*` / `cssPrimary*` / `cssBorder*` / `cssLink*` / `cssFocus*` via `CSS_ROLE` (`206:216:core/web/shared/personalization.ts`, `470:519:theme/core/src/colors.json`).

For every stem that **does** become a single-colour pack, light ≠ dark in the JSON cited above.

---

## 5. How Color derives secondary and accent from a primary

Facade API:

```178:211:theme/core/src/color.ts
  /**
   * Brand accent from a primary — complementary hue.
   * Matches Sass `theme-complementary` for the same solid primary (see CONCEPTS brand role harmony).
   */
  static brandAccent(primary: ColorInput): string {
    return getComplementaryColor(primary);
  }

  /**
   * Analogous candidates for a brand secondary from primary.
   * Hand-tuned `$secondary-color-*` tokens may differ; use this for tooling / previews.
   */
  static brandSecondaryCandidates(primary: ColorInput, angle?: number, count?: number): string[] {
    return createAnalogousColors(primary, angle, count);
  }

  /** Normalize any supported CSS color string to `#rrggbb[aa]` hex. */
  static toHex(color: ColorInput): string { /* … */ }

  /**
   * Resolve brand roles from primary with optional secondary/accent overrides.
   * Default secondary = first analogous candidate; accent = complementary.
   */
  static resolveBrandRoles(primary: ColorInput, overrides?: BrandRoleOverrides): ResolvedBrandRoles {
    const primaryHex = Color.toHex(primary);
    const secondary = overrides?.secondary
      ? Color.toHex(overrides.secondary)
      : (Color.brandSecondaryCandidates(primaryHex)[0] ?? primaryHex);
    const accent = overrides?.accent ? Color.toHex(overrides.accent) : Color.toHex(Color.brandAccent(primaryHex));
    return { primary: primaryHex, secondary, accent };
  }
```

Harmony primitives (defaults: analogous **angle 30°, count 2**; complementary = hue + 180°):

```116:132:theme/core/src/color-palette.ts
export function createAnalogousColors(color: ColorInput, angle = 30, count = 2): string[] {
  const { format, h, s, l, a } = requireParsed(color);
  return generateAnalogousColors(
    h, s, l, a, format,
    requireAnalogousAngle(angle),
    requireAnalogousCount(count)
  );
}

export function getComplementaryColor(color: ColorInput): string {
  const { format, h, s, l, a } = requireParsed(color);
  return generateComplementaryColor(h, s, l, a, format);
}
```

```149:174:theme/core/src/color-palette.ts
function generateAnalogousColors(/* … */): string[] {
  const results: string[] = [];
  const startAngle = h - (angle * count) / 2;
  for (let i = 0; i < count; i++) {
    const newHue = normalizeHue(startAngle + (i + 1) * ((angle * count) / (count + 1)));
    results.push(formatColor(newHue, s, l, a, format));
  }
  return results;
}

function generateComplementaryColor(h: number, s: number, l: number, a: number, format: ColorFormat): string {
  return formatColor(normalizeHue(h + 180), s, l, a, format);
}
```

Personalization wraps that for locks (`265:280:core/web/shared/personalization.ts`): unlocked secondary/accent re-derive; locked values pass as overrides into `Color.resolveBrandRoles`.

Single-colour packs always call `resolveBrandRolesState(primary)` with **no** locks — secondary = first analogous candidate, accent = complementary (`299:301:core/web/shared/personalization.ts`).

---

## How Style Studio applies brand packs today

UI (`AppStyleStudio`):

1. Splits `brandPacks` into `palettePacks` (`kind === 'palette'`) and `colorPacks` (`kind === 'color'`) (`323:324:core/web/app/components/AppStyleStudio/index.vue`).
2. **Packs** radiogroup renders all palette swatches as chips; selecting a radio calls `applyPackToDraft(pack.id)` (`31:42:core/web/app/components/AppStyleStudio/index.vue`).
3. **Colors** radiogroup shows light + dark primary chips; same `applyPackToDraft` (`45:57:core/web/app/components/AppStyleStudio/index.vue`).
4. Live triad reads draft `brandRoles.primary|secondary|accent` (`64:71:core/web/app/components/AppStyleStudio/index.vue`).

Draft path:

```90:93:core/web/app/composables/useStyleStudioDraft.ts
  const applyPackToDraft = (packId: BrandPackId) => {
    personalization.applyBrandPack(packId, { persist: false });
    markDirty();
  };
```

```196:210:core/web/app/composables/usePersonalization.ts
  const applyBrandPack = (packId: BrandPackId, opts: PersistOpts = {}) => {
    const persist = opts.persist !== false;
    accent.value = packId;
    const next = brandRolesFromPack(packId, getTheme().getResolvedThemeMode());
    applyBrandRoles(next, persist);
    if (import.meta.client && persist) localStorage.setItem(ACCENT_KEY, packId);
    // …
  };
```

So today: pack tile → `brandRolesFromPack` (first three palette swatches **or** mode-aware single hue + harmony) → draft brand roles → Apply later persists via Style Studio draft commit. Theme singleton `paletteToTokens` mirrors the same three-swatch truncation for `Theme.select(paletteName)`.

---

## Summary table

| Concern                   | Behaviour                                                           | Primary cite                                                          |
| ------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Theme colour inputs       | primary, secondary, accent, paper, ink (+ deprecated overrides)     | `theme.ts` 62–85, 131–155                                             |
| Palette → tokens / roles  | First three `Object.values` only                                    | `theme.ts` 116–129; `personalization.ts` 292–312                      |
| Palettes >3 swatches      | `darkNightGoldenDay` (4), `pastelDayNight` (5), `midnightMagic` (4) | `colors.json` 18–43                                                   |
| Distinct L/D singles      | 10 `css*` hues + 7 hue-scales (forest…taupe); all L≠D               | `colors.json` 420–466; `personalization.ts` 218–244                   |
| Derive secondary / accent | Analogous[0] (30°/2); complementary (+180°)                         | `color.ts` 178–211; `color-palette.ts` 116–174                        |
| Style Studio              | Packs + Colors radios → `applyPackToDraft` → `brandRolesFromPack`   | `AppStyleStudio/index.vue` 31–57; draft + personalization composables |
