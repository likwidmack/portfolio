---
title: Theme Color + Theme Singletons - Plan
type: feat
date: 2026-09-15
topic: theme-singletons
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Theme Color + Theme Singletons - Plan

## Goal Capsule

**Objective:** Make `@tgmc/theme` coherent — one Sass color/token story, one `Color` API for create/manipulate/convert/lookup, one `Theme` singleton for ready-made themes and runtime variable setting (colors, text, ratios, breakpoints).

**Product authority:** Library hygiene for the design system; unrelated to view-only splash strategy.

**Open blockers:** None.

**Stop:** Do not mix into splash PRs. Do not redesign PrimeVue presets. Do not invent a second token SoT in JS that drifts from Sass.

**Product Contract preservation:** session-settled — full Sass + TS cleanup (chosen over TS-only and Sass-first).

---

## Product Contract

### Summary

Sass remains compile-time source of truth. JS mirrors + `Color` / `Theme` provide a single runtime surface for apps and personalization.

### Key Decisions

- **Full-stack cleanup** (session-settled: user-directed — chosen over TS-only and Sass-first).
- **Module-level singletons** — `Color` facade (mostly pure); `Theme` owns pack registry + token writes (aligned with `token-registry` / `color-mode`).
- **Sass SoT; JS mirrors** — manual sync + pin tests; no Sass→JS codegen this increment.

### Requirements

- R1. `_colors.scss` has no duplicated token blocks; `$main-*` aliases remain stable for `_root.scss`.
- R2. `tokens.ts` maps match Sass brand/surface values and expose ratio/breakpoint CSS keys used by Theme.
- R3. `Color` supports create/parse, manipulate, convert, and named lookup.
- R4. `Theme` supports list/get/create/select packs and set/update including text, ratios, breakpoints.
- R5. App adapters (`theme-tokens` plugin, `services/color`) expose Theme/Color without changing personalization UX.
- R6. `docs/packages/theme.md` documents sync rule and APIs.

---

## Planning Contract

### Architecture

Sass tokens → `_root.scss` CSS vars. JS mirrors feed registry defaults. `Theme` wraps registry + mode; `Color` wraps palette/quality/token helpers.

### Implementation Units

#### U1. Deduplicate Sass color tokens

**Files:** `theme/core/scss/tokens/_colors.scss`

#### U2. Align JS mirrors

**Files:** `theme/core/src/tokens.ts`, `theme/core/tests/tokens-mirror.spec.ts`

#### U3. Color facade

**Files:** `theme/core/src/color.ts`, `theme/core/src/index.ts`, `theme/core/tests/color-facade.spec.ts`

#### U4. Theme singleton

**Files:** `theme/core/src/theme.ts`, `theme/core/src/tokens-public.ts`, `theme/core/tests/theme-singleton.spec.ts`

#### U5. App adapters

**Files:** `core/web/app/plugins/theme-tokens.client.ts`, `core/web/shared/theme/theme-tokens-api.d.ts`, `core/web/services/color/colors.ts`, `core/web/tests/theme-singleton-adapter.spec.ts`

#### U6. Docs

**Files:** `docs/packages/theme.md`, this plan

---

## Verification Contract

- Theme package vitest green (palette, quality, mirrors, Color, Theme).
- Web theme helper + adapter + personalization specs green.
- Theme package `tsc` build succeeds.

## Definition of Done

- All U1–U6 landed on `feat/theme-singletons` (or successor) and PR’d into `development`.
- Docs describe Color/Theme and Sass↔JS sync.
