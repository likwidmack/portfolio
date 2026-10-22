/**
 * Runtime CSS custom-property helpers for `@tgmc/theme`.
 * Browser-only — callers must ensure `document` exists.
 */
import { normalizeColorName, normalizeColorNames } from './color-rename.js';

/** `--`-prefixed, and an old colour name moved to its new name (`null`: retired, never written — R-T8c). */
function propertyName(property: string): string | null {
  return normalizeColorName(property.startsWith('--') ? property : `--${property}`);
}

/** Writes a single custom property on `:root` (an old colour name is written under its new name). */
export function setThemeVariable(property: string, value: string): void {
  const name = propertyName(property);
  if (name !== null) document.documentElement.style.setProperty(name, value);
}

/** Removes custom properties from `:root` (inline styles only; old colour names → new names). */
export function removeThemeVariables(properties: readonly string[]): void {
  for (const property of properties) {
    const name = propertyName(property);
    if (name !== null) document.documentElement.style.removeProperty(name);
  }
}

/** Writes many custom properties on `:root`. */
export function applyThemeVariables(variables: Record<string, string>): void {
  for (const [property, value] of Object.entries(variables)) {
    setThemeVariable(property, value);
  }
}

/**
 * Maps theme token keys to Foundation-facing CSS variables when that layer is active.
 *
 * `--foundation-*` is Foundation's (third-party) interface: the names are kept, and their defaults
 * in `_root.scss` read the `--theme-*-color` names (e.g. `--foundation-accent` →
 * `--theme-accent-color`), so they already follow light/dark. This clears
 * any prior inline overrides on those keys so the stylesheet values win again after
 * an `applyTheme` / registry patch.
 */
const FOUNDATION_ALIAS_KEYS = [
  '--foundation-primary',
  '--foundation-secondary',
  '--foundation-accent',
  '--foundation-success',
  '--foundation-warning',
  '--foundation-alert',
  '--foundation-info',
  '--foundation-body-background',
  '--foundation-body-font-color',
  '--foundation-body-font-secondary',
  '--foundation-global-radius',
  '--foundation-light-gray',
  '--foundation-medium-gray',
  '--foundation-dark-gray',
  '--foundation-border',
  '--foundation-surface',
  '--foundation-surface-variant',
  '--foundation-focus',
  '--foundation-text-secondary',
  '--foundation-button-fg',
  '--foundation-header-color',
  '--foundation-placeholder',
] as const;

export function applyFoundationBridge(_variables?: Record<string, string>): void {
  for (const key of FOUNDATION_ALIAS_KEYS) {
    document.documentElement.style.removeProperty(key);
  }
}

function assignIfPresent(
  bridge: Record<string, string>,
  source: Record<string, string>,
  sourceKey: string,
  targets: string[]
): void {
  const value = source[sourceKey];
  if (!value) {
    return;
  }
  for (const target of targets) {
    bridge[target] = value;
  }
}

/**
 * Maps theme token keys to PrimeVue-facing CSS variables (Nora + complex components).
 * Covers surfaces, typography, overlays, forms, lists, navigation, and severity scales
 * so light/dark font composition stays parallel to `@tgmc/theme`.
 */
export function applyPrimeVueBridge(input: Record<string, string>): void {
  // Read the `--theme-…-color` names; a patch that still uses old keys is normalised first. When
  // two old keys share one new name (`--border-strong` / `--form-border-color`), one value wins.
  const variables = normalizeColorNames(input);
  const bridge: Record<string, string> = {};

  assignIfPresent(bridge, variables, '--theme-primary-color', [
    '--p-primary-color',
    '--p-primary-500',
    '--p-primary-600',
    '--p-highlight-color',
    '--p-highlight-focus-color',
  ]);
  assignIfPresent(bridge, variables, '--theme-primary-hover-color', ['--p-primary-hover-color', '--p-primary-700']);
  assignIfPresent(bridge, variables, '--theme-accent-color', ['--p-primary-active-color']);
  assignIfPresent(bridge, variables, '--theme-button-fg-color', ['--p-primary-contrast-color']);

  assignIfPresent(bridge, variables, '--theme-text-color', [
    '--p-text-color',
    '--p-text-hover-color',
    '--p-content-color',
    '--p-content-hover-color',
    '--p-form-field-color',
    '--p-form-field-icon-color',
    '--p-overlay-select-color',
    '--p-overlay-popover-color',
    '--p-overlay-modal-color',
    '--p-list-option-color',
    '--p-list-option-focus-color',
    '--p-navigation-item-color',
    '--p-navigation-item-active-color',
    // High surface steps are ink in Nora (not ground) — keep nested chrome readable.
    '--p-surface-800',
    '--p-surface-900',
    '--p-surface-950',
  ]);
  assignIfPresent(bridge, variables, '--theme-text-secondary-color', [
    '--p-text-muted-color',
    '--p-text-hover-muted-color',
    '--p-form-field-disabled-color',
    '--p-form-field-float-label-color',
    '--p-form-field-float-label-active-color',
    '--p-list-option-icon-color',
    '--p-list-option-group-color',
    '--p-navigation-item-icon-color',
    '--p-navigation-submenu-label-color',
    '--p-navigation-submenu-icon-color',
    '--p-mask-color',
  ]);

  assignIfPresent(bridge, variables, '--theme-main-background-color', ['--p-surface-ground', '--p-mask-background']);
  assignIfPresent(bridge, variables, '--theme-surface-color', [
    '--p-content-background',
    '--p-surface-card',
    '--p-surface-0',
    '--p-surface-50',
    '--p-overlay-select-background',
    '--p-overlay-popover-background',
    '--p-overlay-modal-background',
  ]);
  assignIfPresent(bridge, variables, '--theme-surface-variant-color', [
    '--p-content-hover-background',
    '--p-surface-overlay',
    '--p-surface-100',
    '--p-surface-200',
    '--p-navigation-item-active-background',
  ]);
  assignIfPresent(bridge, variables, '--theme-border-color', [
    '--p-content-border-color',
    '--p-surface-300',
    '--p-surface-400',
    '--p-overlay-select-border-color',
    '--p-overlay-popover-border-color',
    '--p-overlay-modal-border-color',
  ]);
  assignIfPresent(bridge, variables, '--theme-focus-ring-color', ['--p-focus-ring-color']);

  if (variables['--theme-primary-color']) {
    bridge['--p-highlight-background'] = `color-mix(in srgb, ${variables['--theme-primary-color']} 18%, transparent)`;
    bridge['--p-highlight-focus-background'] =
      `color-mix(in srgb, ${variables['--theme-primary-color']} 28%, transparent)`;
    bridge['--p-list-option-focus-background'] =
      `color-mix(in srgb, ${variables['--theme-primary-color']} 14%, transparent)`;
    bridge['--p-list-option-selected-background'] =
      `color-mix(in srgb, ${variables['--theme-primary-color']} 22%, transparent)`;
    bridge['--p-navigation-item-focus-background'] =
      `color-mix(in srgb, ${variables['--theme-primary-color']} 16%, transparent)`;
  }

  assignIfPresent(bridge, variables, '--theme-form-background-color', [
    '--p-form-field-background',
    '--p-form-field-filled-background',
  ]);
  assignIfPresent(bridge, variables, '--theme-form-background-disabled-color', ['--p-form-field-disabled-background']);
  assignIfPresent(bridge, variables, '--theme-border-strong-color', ['--p-form-field-border-color']);
  assignIfPresent(bridge, variables, '--theme-form-placeholder-color', ['--p-form-field-placeholder-color']);
  assignIfPresent(bridge, variables, '--theme-focus-ring-color', ['--p-form-field-focus-border-color']);
  assignIfPresent(bridge, variables, '--theme-form-invalid-color', [
    '--p-form-field-invalid-border-color',
    '--p-form-field-invalid-placeholder-color',
  ]);

  assignIfPresent(bridge, variables, '--theme-success-hue-color', ['--p-green-500', '--p-green-600']);
  assignIfPresent(bridge, variables, '--theme-warning-hue-color', [
    '--p-orange-500',
    '--p-orange-600',
    '--p-yellow-500',
    '--p-yellow-600',
  ]);
  assignIfPresent(bridge, variables, '--theme-error-hue-color', ['--p-red-500', '--p-red-600']);
  assignIfPresent(bridge, variables, '--theme-info-hue-color', [
    '--p-sky-500',
    '--p-sky-600',
    '--p-blue-500',
    '--p-blue-600',
  ]);

  applyThemeVariables(bridge);
}

/** All `--p-*` keys written by {@link applyPrimeVueBridge} (for full-replace cleanup). */
const PRIMEVUE_BRIDGE_KEYS = [
  '--p-primary-color',
  '--p-primary-500',
  '--p-primary-600',
  '--p-highlight-color',
  '--p-highlight-focus-color',
  '--p-primary-hover-color',
  '--p-primary-700',
  '--p-primary-active-color',
  '--p-primary-contrast-color',
  '--p-text-color',
  '--p-text-hover-color',
  '--p-content-color',
  '--p-content-hover-color',
  '--p-form-field-color',
  '--p-form-field-icon-color',
  '--p-overlay-select-color',
  '--p-overlay-popover-color',
  '--p-overlay-modal-color',
  '--p-list-option-color',
  '--p-list-option-focus-color',
  '--p-navigation-item-color',
  '--p-navigation-item-active-color',
  '--p-surface-800',
  '--p-surface-900',
  '--p-surface-950',
  '--p-text-muted-color',
  '--p-text-hover-muted-color',
  '--p-form-field-disabled-color',
  '--p-form-field-float-label-color',
  '--p-form-field-float-label-active-color',
  '--p-list-option-icon-color',
  '--p-list-option-group-color',
  '--p-navigation-item-icon-color',
  '--p-navigation-submenu-label-color',
  '--p-navigation-submenu-icon-color',
  '--p-mask-color',
  '--p-surface-ground',
  '--p-mask-background',
  '--p-content-background',
  '--p-surface-card',
  '--p-surface-0',
  '--p-surface-50',
  '--p-overlay-select-background',
  '--p-overlay-popover-background',
  '--p-overlay-modal-background',
  '--p-content-hover-background',
  '--p-surface-overlay',
  '--p-surface-100',
  '--p-surface-200',
  '--p-navigation-item-active-background',
  '--p-content-border-color',
  '--p-surface-300',
  '--p-surface-400',
  '--p-overlay-select-border-color',
  '--p-overlay-popover-border-color',
  '--p-overlay-modal-border-color',
  '--p-focus-ring-color',
  '--p-highlight-background',
  '--p-highlight-focus-background',
  '--p-list-option-focus-background',
  '--p-list-option-selected-background',
  '--p-navigation-item-focus-background',
  '--p-form-field-background',
  '--p-form-field-filled-background',
  '--p-form-field-disabled-background',
  '--p-form-field-border-color',
  '--p-form-field-placeholder-color',
  '--p-form-field-focus-border-color',
  '--p-form-field-invalid-border-color',
  '--p-form-field-invalid-placeholder-color',
  '--p-green-500',
  '--p-green-600',
  '--p-orange-500',
  '--p-orange-600',
  '--p-yellow-500',
  '--p-yellow-600',
  '--p-red-500',
  '--p-red-600',
  '--p-sky-500',
  '--p-sky-600',
  '--p-blue-500',
  '--p-blue-600',
] as const;

/** Clears inline PrimeVue bridge variables so a full registry replace can rebuild from baseline. */
export function clearPrimeVueBridge(): void {
  removeThemeVariables(PRIMEVUE_BRIDGE_KEYS);
}

/**
 * Applies theme variables and optional library bridges in one pass.
 * Prefer `Theme.apply` from `@tgmc/theme` / `@tgmc/theme/tokens` when third
 * parties need registry + subscription behavior.
 */
export function applyTheme(
  variables: Record<string, string>,
  options: { foundation?: boolean; primevue?: boolean } = {}
): void {
  variables = normalizeColorNames(variables);
  applyThemeVariables(variables);
  if (options.foundation) {
    applyFoundationBridge(variables);
  }
  if (options.primevue) {
    applyPrimeVueBridge(variables);
  }
}

/** @deprecated Prefer `setThemeVariable` — kept for `@tgmc/web` call-site compatibility. */
export default function setCssVariable(property: string, value: string): void {
  setThemeVariable(property, value);
}
