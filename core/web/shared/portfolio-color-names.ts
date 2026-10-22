/**
 * App-global colour names (colour system, web-globals stage — R-T4a).
 *
 * Every colour-valued `--portfolio-*` variable is named `--portfolio-<stem>-color`. The old names
 * were aliases until colour system Task 8 removed them (archived in
 * `theme/core/scss/_archive/2026-09-29-color-aliases/`); this map stays for the codemod
 * (`scripts/rename-color-vars.mjs`), the guards and the stored-key migration below.
 * Non-colour `--portfolio-*` names (space, stack gaps, surface mix, background image / repeat /
 * size / position / attachment / blend mode, particle shadow) keep their names.
 *
 * The same map migrates persisted Background → Custom option keys (`tgmc-background-options`)
 * written under the old names — see `shared/preferences/`.
 */

const STEMS = [
  // Atmosphere chrome — blends of the theme colours (R-T4b).
  'rose',
  'rose-strong',
  'haze-1',
  'haze-2',
  'haze-3',
  'haze-4',
  'particle-strong',
  'particle-mid',
  'particle-soft',
  'grid-glow',
  'grid-line',
  'rule',
  'coral',
  'teal',
  'ink',
  'ivory',
  // Preset / custom background roles — rename only (R-T4c); runtime writers set the new names.
  'primary',
  'primary-light',
  'primary-dark',
  'secondary',
  'secondary-light',
  'secondary-dark',
  'accent',
  'accent-light',
  'accent-dark',
  'background-primary',
  'background-primary-light',
  'background-primary-dark',
  'background-secondary',
  'background-secondary-light',
  'background-secondary-dark',
  'background-accent',
  'background-accent-light',
  'background-accent-dark',
  // Solid Background → Custom fill (written by `usePersonalization`).
  'depth-custom',
] as const;

/** Old colour name → new `--portfolio-*-color` name. */
export const PORTFOLIO_COLOR_RENAMES: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(STEMS.map((stem) => [`--portfolio-${stem}`, `--portfolio-${stem}-color`]))
);

/** The new name for an old `--portfolio-*` colour name; any other name is returned unchanged. */
export function portfolioColorName(name: string): string {
  return PORTFOLIO_COLOR_RENAMES[name] ?? name;
}
