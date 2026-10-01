/**
 * Theme Studio presets — collections and single light/dark colors.
 * Built from `colors.json` palettes and Sass light/dark hue pairs.
 * Collections with more than three swatches keep the extra colors as a clipped gradient field.
 * Single colors take secondary and accent from {@link Color.resolveBrandRoles}.
 */
import { Color } from './color.js';
import { palettes, sassColors } from './tokens.js';

export type StudioPresetKind = 'collection' | 'color';

export type StudioPresetBackground = {
  /** Layered gradients using swatches past the brand triad. */
  image: string;
  /** Decorative clip so the field is a shape, not a full-bleed wash. */
  clip: string;
};

export type StudioPreset = {
  id: string;
  kind: StudioPresetKind;
  label: string;
  swatches: string[];
  primary: { light: string; dark: string };
  secondary: { light: string; dark: string };
  accent: { light: string; dark: string };
  /** Background triad. Missing slots are the brand triad derived from the source color. */
  backgroundRoles: {
    primary: { light: string; dark: string };
    secondary: { light: string; dark: string };
    accent: { light: string; dark: string };
  };
  background: StudioPresetBackground | null;
};

type ModeHex = { light: string; dark: string };

/** Same role steps for a palette or a single themed color. Missing roles come from the source hex. */
function rolesFromSources(
  lightSource: string,
  darkSource: string,
  extras: string[] = []
): Pick<StudioPreset, 'primary' | 'secondary' | 'accent' | 'backgroundRoles'> {
  const light = Color.resolveBrandRoles(lightSource);
  const dark = Color.resolveBrandRoles(darkSource);
  const backgroundLight = Color.resolveBrandRoles(extras[0] ?? lightSource);
  const backgroundDark = Color.resolveBrandRoles(extras[0] ?? darkSource);
  const pair = (lightHex: string, darkHex: string): ModeHex => ({ light: lightHex, dark: darkHex });
  return {
    primary: pair(light.primary, dark.primary),
    secondary: pair(light.secondary, dark.secondary),
    accent: pair(light.accent, dark.accent),
    backgroundRoles: {
      primary: pair(extras[0] ?? backgroundLight.primary, extras[0] ?? backgroundDark.primary),
      secondary: pair(extras[1] ?? backgroundLight.secondary, extras[1] ?? backgroundDark.secondary),
      accent: pair(extras[2] ?? backgroundLight.accent, extras[2] ?? backgroundDark.accent),
    },
  };
}

function themeSources(swatches: string[]): ModeHex {
  const sorted = [...swatches].sort((a, b) => Color.create(a).l - Color.create(b).l);
  return { dark: sorted[0] ?? '#000000', light: sorted[sorted.length - 1] ?? '#000000' };
}

const ROLE_STEMS = new Set(['primary', 'secondary', 'accent', 'text', 'success', 'warning', 'alert', 'error', 'info']);
const CSS_ROLE = /^(surface|primary|border|link|text|background|focus)/i;

const FIELD_CLIPS = [
  'polygon(0 0, 100% 0, 100% 70%, 0 100%)',
  'circle(68% at 88% 12%)',
  'ellipse(78% 58% at 12% 88%)',
  'polygon(18% 0, 100% 0, 82% 100%, 0 100%)',
];

const FIELD_ANCHORS = ['18% 28%', '82% 18%', '74% 78%', '16% 76%'];

function labelFromKey(id: string): string {
  const stripped = id.replace(/^css/, '');
  const spaced = stripped.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isSingleColorStem(stem: string): boolean {
  if (/^css[A-Z][a-z]+$/.test(stem)) return !CSS_ROLE.test(stem.slice(3));
  return /^[a-z]+$/.test(stem) && !ROLE_STEMS.has(stem);
}

/** Extra swatches become a static mesh. No animation — reduced-motion stays the default. */
function fieldFromExtras(extras: string[], index: number): StudioPresetBackground {
  const layers = extras.map((hex, offset) => {
    const at = FIELD_ANCHORS[(index + offset) % FIELD_ANCHORS.length];
    return `radial-gradient(ellipse at ${at}, ${hex} 0%, transparent 58%)`;
  });
  const wash = extras[0] ?? '#000000';
  layers.push(`linear-gradient(145deg, ${wash} 0%, transparent 72%)`);
  return {
    image: layers.join(', '),
    clip: FIELD_CLIPS[index % FIELD_CLIPS.length] ?? FIELD_CLIPS[0]!,
  };
}

function collectionPresets(): StudioPreset[] {
  return Object.entries(palettes).map(([id, swatchMap], index) => {
    const swatches = Object.values(swatchMap).map((hex) => Color.toHex(hex));
    const sources = themeSources(swatches);
    const extras = swatches.slice(1);
    const roles = rolesFromSources(sources.light, sources.dark, extras);
    return {
      id,
      kind: 'collection',
      label: labelFromKey(id),
      swatches,
      ...roles,
      background: extras.length > 0 ? fieldFromExtras(extras, index) : null,
    };
  });
}

function colorPresets(): StudioPreset[] {
  const pairs = new Map<string, { light?: string; dark?: string }>();
  for (const [key, hex] of Object.entries(sassColors)) {
    const match = /^(.*)(Light|Dark)$/.exec(key);
    const stem = match?.[1];
    if (!stem || !isSingleColorStem(stem)) continue;
    const current = pairs.get(stem) ?? {};
    current[match[2] === 'Light' ? 'light' : 'dark'] = Color.toHex(hex);
    pairs.set(stem, current);
  }
  const presets: StudioPreset[] = [];
  for (const [stem, pair] of pairs) {
    if (!pair.light || !pair.dark) continue;
    const lightRoles = rolesFromSources(pair.light, pair.dark);
    const idStem = stem.replace(/^css/, '');
    presets.push({
      id: `color${idStem.charAt(0).toUpperCase()}${idStem.slice(1)}`,
      kind: 'color',
      label: labelFromKey(stem),
      swatches: [pair.light, pair.dark],
      primary: lightRoles.primary,
      secondary: lightRoles.secondary,
      accent: lightRoles.accent,
      backgroundRoles: lightRoles.backgroundRoles,
      background: null,
    });
  }
  return presets;
}

/** Preset catalog for Theme Studio. Order: collections, then single colors. */
export function buildStudioPresets(): StudioPreset[] {
  return [...collectionPresets(), ...colorPresets()];
}
