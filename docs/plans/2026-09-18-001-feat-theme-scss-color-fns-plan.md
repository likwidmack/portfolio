---
title: Theme SCSS Color Functions - Plan
type: feat
date: 2026-09-18
topic: theme-scss-color-fns
artifact_contract: ce-unified-plan/v1
artifact_readiness: shipped
product_contract_source: ce-brainstorm
execution: code
---

# Theme SCSS Color Functions - Plan

> **Status (2026-09-19):** Shipped on `feat/theme-scss-color-fns`. Follow-ups beyond this plan’s original Stop line: `$accent-*` is complementary of primary (not an alias); Nuxt `nuxt-auto` forwards color-fns; Personalize brand-role pickers + custom background. Treat this file as historical requirements; living docs are [packages/theme.md](../packages/theme.md) and [web/features/personalization.md](../web/features/personalization.md).

## Goal Capsule

**Objective:** Give `@tgmc/theme` Sass a `theme-`-prefixed color helper API for compile-time token authoring — manipulate, on-ink, harmony, and WCAG contrast-ratio — without rewriting the existing hex token SoT.

**Product authority:** Theme package design-system hygiene. Extends `docs/plans/2026-09-15-001-feat-theme-singletons-plan.md`. App/page SCSS consumption and JS quality analysis are not active scope.

**Open blockers:** None.

**Stop:** Do not bulk-replace hand-tuned light/dark role hexes. Do not change `$accent-*` aliases to computed complementary values in this increment. Do not port quality / enhance to Sass. Do not require JS↔Sass output pin tests.

**Execution profile:** Test-backed feature work in `@tgmc/theme` (Sass + Vitest compile smoke). Prefer small, reviewable units; verify with theme package tests before app-wide builds.

---

## Product Contract

### Summary

Ship a dedicated Sass color-fns surface next to the existing contrast/fill helpers.
Token authors get `theme-`-prefixed wrappers over Sass-native color math, plus custom harmony and contrast-ratio.
Keep today’s hex roles as SoT; prove the API with docs, one real use, and compile/smoke tests.
Document the brand harmony rule: secondary is analogous to primary; accent is complementary to primary.

### Problem Frame

JS already exposes a rich `Color` API (manipulate, convert, harmony, contrast, quality).
Theme SCSS only has fill/on-ink contrast helpers and ad-hoc `sass:color` at a few call sites.
Token authors lack a named, documented Sass toolkit aligned with that capability — without forcing a palette rewrite or claiming pixel parity with JS.

### Requirements

- R1. Theme Sass exposes `theme-lighten`, `theme-darken`, `theme-adjust-lightness`, and `theme-add-alpha`, implemented with Sass-native color APIs (not JS-matched amounts).
- R2. Theme Sass exposes `theme-is-light` and `theme-contrast-ink` (or equivalent names) that complement existing fill/contrast pairing.
- R3. Theme Sass exposes `theme-analogous`, `theme-complementary`, and low-cost extras (`theme-split-complementary`, `theme-triadic`, `theme-tetradic`) returning colors or lists.
- R4. Theme Sass exposes `theme-contrast-ratio` for opaque colors (WCAG 2.x relative luminance).
- R5. Quality analysis, enhance, and palette-quality remain JS-only (`Color.quality` / related).
- R6. Existing hand-tuned role hexes stay SoT; this increment does not bulk-derive or replace light/dark primary/secondary/accent values.
- R7. Docs (`docs/packages/theme.md`) describe the helpers, Sass-vs-JS divergence, and the brand harmony rule (R8).
- R8. Brand harmony rule: secondary is an analogous color of primary; accent is the complementary color of primary. (session-settled: user-directed — stated as product FYI during brainstorm confirmation)
- R9. At least one intentional token call site uses the new helpers (replace an existing ad-hoc `color.adjust` usage — not a palette redesign).
- R10. Contract tests cover helper compile/smoke behavior without requiring bit-identity with JS `Color.*`.
- R11. Color-fns live in `theme/core/scss/tokens/_color-fns.scss`; `_contrast.scss` remains specialized for fill/on-ink pairing and stays forwarded.

### Key Decisions

- KTD1. Optimize for compile-time token authoring first, not app/page SCSS parity. (session-settled: user-directed — chosen over app parity and full Color mirror-first)
- KTD2. Keep hex SoT; add named helpers rather than deriving/replacing existing roles now. (session-settled: user-directed — chosen over derive-variants-from-bases and JS-parity-pin as the done bar)
- KTD3. Scope is manipulate + on-ink + harmony + contrast-ratio; quality stays JS-only. (session-settled: user-directed — chosen over one-increment full Color.* and over phased-only manipulate)
- KTD4. `theme-` prefix with Sass-native math; document JS divergence; custom-implement harmony and contrast-ratio. (session-settled: user-directed — chosen over JS-matched semantics and bare names that clash with `sass:color`)
- KTD5. Success = API shipped + one real use + contract tests + docs. (session-settled: user-directed)
- KTD6. Dedicated `_color-fns.scss`; keep `_contrast.scss` specialized. (session-settled: user-approved — approach B)
- KTD7. Brand roles follow primary→analogous secondary and primary→complementary accent. (session-settled: user-directed)
- KTD8. Demo use = migrate existing `color.adjust` accents on `$main-background-*-accent` in `tokens/_colors.scss` to `theme-*` helpers; document R8 in comments/docs without rewriting `$accent-*` hex aliases. (session-settled: user-approved — planning default for Q1; chosen over correcting accent to complementary now)
- KTD9. Function prefix is `theme-` (not `tgmc-`). (session-settled: user-approved — planning default for Q2)

### Scope Boundaries

**In**

- Theme package Sass helpers, forwarding, docs, one demo use, contract tests
- Brand harmony rule documented and available via harmony helpers

**Out**

- Bulk rewrite of existing light/dark role hexes to match computed harmony
- Changing `$accent-*` from primary alias to complementary hex in this increment
- Porting quality / enhance / palette-quality to Sass
- JS↔Sass numeric/hex pin tests as a merge gate
- Making app `core/web` styles the primary consumer
- Redesigning PrimeVue presets or runtime Theme singleton behavior

### Acceptance Examples

- AE1. A token author `@use`s `@tgmc/theme/scss/tokens` (or the color-fns module) and can call `theme-lighten` / `theme-darken` / `theme-add-alpha` without importing `sass:color` directly.
- AE2. `theme-analogous` / `theme-complementary` return usable colors; docs state secondary = analogous(primary), accent = complementary(primary).
- AE3. `theme-contrast-ratio` returns a unitless number for two opaque colors; `theme-contrast-ink` picks light vs dark ink for a solid sample.
- AE4. Button/contrast-fill behavior unchanged except for the intentional `$main-background-*-accent` demo migration.
- AE5. Theme Vitest suite fails if helpers missing or Sass compile of the fixture fails; suite does not fail solely because JS `Color.lighten` differs from Sass output.

### How This Work Fits Together

Related to `docs/plans/2026-09-15-001-feat-theme-singletons-plan.md` (Sass SoT + JS `Color` facade).
This plan adds the missing Sass helper layer; it does not reopen singleton shape or JS API redesign.
App SCSS hybrid split (`docs/web/features/app-scss.md`) stays separate.
Vocabulary: `CONCEPTS.md` → Brand role harmony.

### Outstanding Questions

- Q1. ~~Accent correction vs document-only~~ — **resolved** in KTD8 (document + demo migrate of existing `color.adjust`; no accent hex rewrite).
- Q2. ~~Prefix spelling~~ — **resolved** in KTD9 (`theme-`).

### Sources

- Origin: `docs/plans/2026-09-18-001-feat-theme-scss-color-fns-plan.md` (this file; enriched from requirements-only)
- Patterns: `theme/core/scss/tokens/_contrast.scss`, `theme/core/src/color.ts`, `theme/core/src/color-palette.ts`, `theme/core/src/color-quality.ts` (`calculateContrastRatio`), `docs/packages/theme.md`

---

## Planning Contract

### Technical Design

**Module layout**

- Add `theme/core/scss/tokens/_color-fns.scss`.
- `@use 'sass:color'`, `@use 'sass:math'`, `@use 'sass:list'` / `@use 'sass:meta'` as needed.
- `@forward 'color-fns'` from `theme/core/scss/tokens/_index.scss` (and `@use` if in-module consumers need members).
- Do not fold harmony/ratio into `_contrast.scss`; optionally have on-ink helpers call the same ink tokens contrast already uses (`$css-button-fg-*`) for consistency.

**Manipulate (Sass-native)**

- Prefer `color.adjust(..., $lightness: …, $space: hsl)` / `color.change` / `color.scale` as appropriate; document parameter meaning (percentage points vs relative scale) in doc comments.
- `theme-add-alpha` should return a color with alpha (Sass color type), not an 8-digit hex string (JS `addAlpha` hex-suffix behavior is intentionally not mirrored).

**Harmony (custom)**

- Hue-wheel offsets in HSL space, mirroring the _intent_ of `color-palette.ts` generators (complementary +180; analogous ±angle; split/triadic/tetradic as listed in R3).
- Accept Sass `color` inputs; return color or list of colors. Default analogous angle/count should be documented (JS defaults: angle 30, count 2).

**Contrast ratio (custom)**

- WCAG 2 relative luminance + contrast ratio for opaque colors; directional guidance from `calculateContrastRatio` in `color-quality.ts` without requiring identical floating-point output.

**Demo use (R9)**

- In `tokens/_colors.scss`, replace:

  - `$main-background-dark-accent: color.adjust($violet-light, $lightness: -20%, $space: hsl)`
  - `$main-background-light-accent: color.adjust($violet-dark, $lightness: 10%, $space: hsl)`

  with `theme-darken` / `theme-lighten` (or `theme-adjust-lightness`) equivalents that preserve current visual intent as closely as Sass-native math allows.

- Near brand roles, add comments stating R8 (secondary analogous, accent complementary) and that current `$accent-*` still aliases primary pending a future visual pass.

**Tests**

- New `theme/core/tests/scss-color-fns.spec.ts` using workspace `sass` (`compileString` / `compile`) against a fixture that `@use`s the color-fns module with `loadPaths` pointing at `theme/core/scss`.
- Assert: manipulate returns color type; analogous returns list length; complementary returns color; contrast-ratio is a number greater than 20 for black/white; fixture compiles without error.
- Wire into existing `npm test` / `node ./bin/run-vitest.mjs` for `@tgmc/theme`.

**Docs**

- Extend `docs/packages/theme.md` with a “Sass color helpers” section: table of functions, Sass-vs-JS note, brand harmony rule, example `@use`.
- Keep `CONCEPTS.md` Brand role harmony entry (already present).

### Assumptions

- A1. Root workspace `sass` dependency is available to theme Vitest (hoisted); if not, add `sass` as a theme `devDependency`.
- A2. Migrating the two `$main-background-*-accent` lines may produce slightly different hex than today’s `color.adjust` if helper wrappers choose `scale` vs `adjust` — acceptable if lightness direction is preserved; snapshot the chosen helper params in the token file comments.
- A3. `theme/core/scss/globals/_mixins.scss` re-exports of fill-lightness stay unchanged; no requirement to re-export `theme-*` there in this increment (tokens index is enough for token authors).

### Sequencing

1. U1 — color-fns API module
2. U2 — forward + demo token use + brand comments
3. U3 — Vitest Sass compile smoke
4. U4 — docs

U3 may start after U1; U2 and U3 can proceed in parallel after U1. U4 last or parallel with U2.

### Implementation Constraints

- Modern Sass module system only (`@use` / `@forward`); no new global `@function` pollution outside the module.
- Do not `@use` `_globals` or inject selectors from color-fns.
- Preserve existing `_contrast.scss` public names (`fill-lightness`, `dyn-color-against-fill`, `contrast-fill`).

---

## Implementation Units

### U1. Color-fns Sass API

- **Goal:** Implement `theme-*` manipulate, on-ink, harmony, and contrast-ratio helpers in a dedicated module.
- **Requirements:** R1–R5, R11
- **Files:** `theme/core/scss/tokens/_color-fns.scss` (create); reference `theme/core/scss/tokens/_contrast.scss`, `theme/core/src/color-palette.ts`, `theme/core/src/color-quality.ts`
- **Approach:** Sass-native wrappers for adjust/alpha; custom HSL hue offsets for harmony; WCAG luminance for ratio; on-ink using lightness threshold vs existing button fg tokens when those are in scope (or local black/white fallbacks documented if token `@use` would cycle).
- **Test scenarios:**
  - T1. Module compiles when `@use`d with load path `theme/core/scss/tokens` (or package tokens root).
  - T2. `theme-lighten` / `theme-darken` change HSL lightness in the expected direction.
  - T3. `theme-analogous` returns a list; `theme-complementary` returns a single color.
  - T4. `theme-contrast-ratio(black, white)` is finite and greater than 20.
  - T5. `theme-is-light` / `theme-contrast-ink` classify a light sample vs a dark sample differently.
- **Verification:** Theme package tests green for new coverage once U3 lands; manually compile fixture if U3 not yet present.
- **Dependencies:** None

### U2. Forward + demo token use

- **Goal:** Export helpers from tokens index; migrate one real call site; document R8 beside brand roles.
- **Requirements:** R6, R8, R9, R11
- **Files:** `theme/core/scss/tokens/_index.scss`, `theme/core/scss/tokens/_colors.scss`
- **Approach:** `@forward 'color-fns'`; replace `$main-background-*-accent` `color.adjust` with `theme-*`; add brand-harmony comments near `$primary` / `$secondary` / `$accent` without changing accent hex aliases.
- **Test scenarios:**
  - T1. Theme SCSS entry / tokens consumers still compile (covered by U3 fixture importing tokens or by existing app/theme build smoke if run).
  - T2. `$main-background-*-accent` no longer call `color.adjust` directly (grep/contract or comment assertion in review).
- **Verification:** No Sass compile errors in theme tokens; visual spot-check accents optional.
- **Dependencies:** U1

### U3. Vitest Sass compile smoke

- **Goal:** Durable contract tests for the color-fns API without JS parity pins.
- **Requirements:** R10, AE1–AE3, AE5
- **Files:** `theme/core/tests/scss-color-fns.spec.ts` (create); optionally `theme/core/tests/fixtures/color-fns-smoke.scss`
- **Approach:** Use `sass.compileString` with `loadPaths` including `theme/core/scss` and/or `theme/core/scss/tokens`; assert CSS output or use Sass custom functions introspection via compiling to CSS with exported values written as custom properties in the fixture.
- **Test scenarios:**
  - T1. Fixture compiles.
  - T2. Emitted CSS contains expected custom-property probes for lighten direction, analogous list length, complementary presence, contrast-ratio magnitude.
  - T3. Quality helpers are not required / not present in Sass API (negative doc assertion only — no test for absent quality).
- **Verification:** `npm test --workspace=@tgmc/theme` (or `cd theme/core && npm test`)
- **Dependencies:** U1 (U2 optional for this unit)

### U4. Theme package docs

- **Goal:** Document helpers, divergence, and brand harmony for human/agent consumers.
- **Requirements:** R7, R8
- **Files:** `docs/packages/theme.md`; confirm `CONCEPTS.md` Brand role harmony remains accurate
- **Approach:** New subsection under brand/Sass guidance with function table and minimal usage example.
- **Test scenarios:** None automated — reviewer checklist that docs name `theme-` prefix, Sass-vs-JS note, and R8.
- **Verification:** Docs catalog already lists `docs/packages/theme.md`; no catalog change required unless a new page is added.
- **Dependencies:** U1 (names stable)

---

## Verification Contract

- **Unit / contract:** `npm test --workspace=@tgmc/theme` (includes new `scss-color-fns.spec.ts`).
- **Compile sanity (optional stretch):** `npm run build --workspace=@tgmc/theme` to ensure SCSS assets still copy to `dist`.
- **App build:** Not required for merge of this theme-only increment unless implementer touches Nuxt-consumed paths beyond tokens.
- **Manual:** Spot-check that `$main-background-*-accent` still reads as violet-tinted accents in light/dark if a local app preview is handy.

---

## Definition of Done

- All units U1–U4 complete against R1–R11.
- Theme Vitest green with Sass color-fns smoke coverage.
- `docs/packages/theme.md` documents the API + brand harmony rule.
- No bulk role hex rewrite; `$accent-*` still aliases primary unless a follow-up plan changes that.
- Ready for `ce-work` / PR into `development` via feature branch (do not push `development`/`main` directly).
