---
title: 'Hybrid app SCSS: variables SoT, mixins, globals once via launch'
date: 2026-09-15
category: architecture-patterns
module: 'core/web app SCSS'
problem_type: architecture_pattern
component: development_workflow
severity: medium
applies_when:
  - 'Adding or changing portfolio CSS custom properties under core/web'
  - 'Migrating duplicated page SCSS into shared partials'
  - 'Running ce-optimize scss_lines experiments on app styles'
tags:
  - app-scss
  - sass-modules
  - portfolio-css
  - scss-lines
  - ce-optimize
---

# Hybrid app SCSS: variables SoT, mixins, globals once via launch

## Context

The Nuxt app (`core/web`) owns portfolio-specific styling beside `@tgmc/theme`. Global CSS loads theme first (`styles.scss`), then `portfolio-launch.scss`.

The architecture splits responsibilities:

| Layer            | File                    | Role                                                                                                                              |
| ---------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Tokens           | `_variables.scss`       | SoT for app `:root` / `html[data-theme]` `--portfolio-*` (and documented font overrides). Emitted when launch `@use`s the module. |
| Recipes          | `_mixins.scss`          | Mixin-only helpers (`portfolio-box-contain`, `portfolio-soft-surface`, `portfolio-eyebrow`, `portfolio-stack`) — no selectors.    |
| Shared selectors | `_globals.scss`         | HTML tags and shared classes that must appear once in the bundle.                                                                 |
| Chrome           | `portfolio-launch.scss` | Fonts, `@use` chain, leftover grids/dialog/motion.                                                                                |

An earlier design pass described `_globals.scss` as mixin-only. The shipped tree uses `_mixins.scss` for recipes and `_globals.scss` for selectors. Prefer `docs/web/features/app-scss.md` and `core/web/tests/app-scss-sot.spec.ts` over stale superpowers specs/plans.

A later ce-optimize run minimized `scss_lines` (baseline about 3880 → 3847) by keeping stack migrations; a `portfolio-soft-bg($mix)` mixin experiment that raised `scss_lines` despite fewer soft-surface literals was reverted (ce-optimize iteration 3).

## Guidance

1. **Variables on the global path only** — define `--portfolio-*` in `_variables.scss`; emit via `@use './variables'` from launch. Do not put a second `:root` in launch or page sheets.
2. **Pages `@use` mixins, never globals** — standalone sheets `@use 'mixins' as *` (Sass `loadPaths` → `assets/css`); Vue SFCs get mixins via Vite `additionalData` (absolute `@use` of `_mixins.scss`, same Vue-only exclusion gate as theme `nuxt-auto` — never inject `_globals`). `@use` of `_globals.scss` from pages re-emits selectors and bloats CSS. Cover inject/loadPaths with `vite-prop-scss-inject.spec.ts`.
3. **Mixin vs selector** — mixin when ≥2 sheets need the same recipe or scoped Vue needs `@include`; selector in `_globals.scss` when the rule should load once on every page.
4. **Measure before keeping optimize diffs** — `node scripts/measure-app-scss.mjs` / `node scripts/measure-scss-imports.mjs` report line/import metrics and `contract_tests_passed`. Stack migrations usually win; new mixin churn can raise `scss_lines` even when it looks cleaner.
5. **Keep agent design/plan docs aligned** when the mixins/globals split or Nuxt inject path changes, so agents do not reintroduce fragile `../assets/css/mixins` `@use` patterns.
6. **Theme boundary** — do not shadow theme token names from app variables (except documented bridges like `--portfolio-coral` → `--accent-color`).

## Why This Matters

Correct cascade for FOUC/personalization (brand roles + optional custom depth background), one copy of shared selectors, a clear map for agents, and metric-grounded dedupe instead of speculative mixin extraction. Theme stays upgradeable without app overrides fighting package tokens. Living contracts: [app-scss.md](../../web/features/app-scss.md), [personalization.md](../../web/features/personalization.md).

## When to Apply

- Adding portfolio-wide CSS custom properties or shared element chrome under `core/web`
- Migrating duplicated page/component SCSS (including ce-optimize / `scss_lines` work)
- Renaming or splitting app CSS partials (update launch `@use` order, SoT tests, and feature docs together)

## Examples

**Forbidden — page imports globals:**

```scss
// DO NOT — re-emits .page-content, links, tags
@use '../../assets/css/globals';
```

**Correct — standalone sheet opt-in mixins:**

```scss
@use 'mixins' as *;

.some-block {
  @include portfolio-stack(var(--portfolio-stack-gap-lg));
  @include portfolio-soft-surface;
}
```

**Correct — Vue SFC:** omit `@use` for mixins (Vite `additionalData` injects `_mixins.scss`); use `@include portfolio-*`.

**Launch emits once** (also `@use`s theme tokens and `_layout.scss` before this app-owned chain):

```scss
@use './variables';
@use './mixins' as *;
@use './globals';
```

| Optimize action                                           | Likely `scss_lines` | Caveat                           |
| --------------------------------------------------------- | ------------------- | -------------------------------- |
| Replace repeated grid/gap with `@include portfolio-stack` | Decrease            | Delete the literals              |
| Add a mixin used only once                                | May increase        | Measure; inline can be cheaper   |
| Soft-surface wrapper without enough literal deletion      | Increase            | Revert if primary metric worsens |

Confirm `contract_tests_passed: 1` after structural changes.

## Related Issues

- Canonical contract: [docs/web/features/app-scss.md](../../web/features/app-scss.md)
- Inject wiring: `core/web/config-properties/scss-additional-data.ts`, `scss-auto-use.ts`, `vite-prop.ts`
- Theme boundary: [docs/packages/theme.md](../../packages/theme.md)
- Refresh candidates (stale mixin-only wording): `docs/superpowers/specs/2026-09-15-app-scss-variables-globals-design.md`, `docs/superpowers/plans/2026-09-15-app-scss-variables-globals.md`
- Optimize context: `.context/compound-engineering/ce-optimize/app-scss-dedupe/`
