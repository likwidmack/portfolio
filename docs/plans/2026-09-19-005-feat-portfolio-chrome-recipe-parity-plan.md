---
title: Portfolio Chrome Recipe Parity - Plan
type: feat
date: 2026-09-19
topic: portfolio-chrome-recipe-parity
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: session
execution: code
---

# App `--portfolio-*` recipe parity - Plan

> **Status (2026-09-19):** Shipped on `development` via PR #154 (`feat/portfolio-chrome-recipe-parity`). Treat this file as a retrospective of the landed Shape A surface. Living docs: [web/features/app-scss.md](../web/features/app-scss.md), CONCEPTS.md. Residual hardening is under **Deferred / Open Questions** (not unstarted greenfield work).

## Goal Capsule

**Objective (landed):** Close deferred app Sass↔JS parity for `--portfolio-*` atmosphere chrome via JS recipe mirrors (`portfolio-chrome.ts`) pinned against a Sass dump — no second hex SoT, no chrome in theme `colors.json`.

**Stop:** No JSON→Sass; no BRAND_PACKS rewrite; no promoting chrome into `@tgmc/theme` public API. CSS-only stays CSS-only: coral → accent bridge; `--portfolio-rule` / `--portfolio-grid-line` and soft/semantic `var()` / runtime `color-mix` aliases; particle-shadow multi-values.

## Product decisions (locked)

- Shape A: recipe mirror (not resolved dump library for runtime)
- Atmosphere recipe inputs = theme `Color.named` tokens; paper ivory/ink = `themeColors.*.background` (via chrome helpers)
- Sass/`_variables.scss` remains CSS emit SoT; UI keeps CSS vars
- Float HSL adjust matches Sass `theme-lighten`/`theme-darken` — do **not** use `Color.lighten` / `Color.darken` / `Color.adjustLightness` on the pin path (those round HSL integers first)
- Expressions SoT for atmosphere = `_variables.scss`; dump is test-only twin of those expressions

### Atmosphere token inventory (mirrored)

| Token                    | Light (`:root`)                                                  | Dark                                                            |
| ------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| rose                     | `theme-lighten($oxblood-dark, 10%)`                              | `theme-lighten($oxblood-dark, 28%)`                             |
| rose-strong              | `$primary-color-dark`                                            | `theme-lighten($oxblood-dark, 42%)`                             |
| haze-1…4                 | `color.mix($main-background-light, $oxblood-dark, 72/78/84/90%)` | mixes + `theme-darken($oxblood-light, …)` per `_variables.scss` |
| particle-strong/mid/soft | primary / mix / mix                                              | lighten recipes / `$text-color-dark`                            |
| grid-glow                | mix 88%                                                          | `theme-darken($oxblood-dark, 8%)`                               |

## Current tree (landed)

1. `core/web/shared/portfolio-chrome.ts` — `getPortfolioChrome`, `portfolioTeal`, paper hex helpers
2. `core/web/assets/css/export/portfolio-chrome-dump.scss` + `core/web/tests/portfolio-chrome.spec.ts`
3. `CONCEPTS.md` + `docs/web/features/app-scss.md`; personalization ivory/ink via chrome module

## Verification (landed + residual)

**Landed**

- `npm test` — `portfolio-chrome.spec.ts` + personalization ivory/ink pins
- Pin harness: compile dump with Sass `loadPaths` including `theme/core` → parse `:root` / `html[data-theme=dark]` → assert each mirrored prop equals `getPortfolioChrome(mode)` after `Color.toHex` normalize (Sass wins)

**Residual (required hardening — see Open Questions for larger architecture)**

- Dump↔`_variables` must assert **property-keyed** (or full chrome-block) equality of recipe bindings — not unordered substring co-occurrence of mix/lighten snippets. Bare-token assignments (`$primary-color-dark`, `$text-color-dark`) must be included.

## Deferred / Open Questions

### From 2026-09-19 review

- **Shape A falsifiers:** Under what measured drift (e.g. Sass upgrade float-HSL mismatch) or consumer growth would Shape A be abandoned for a resolved dump/oracle (or fixing theme `Color.lighten` precision)? Document a one-paragraph rejection of alternatives when deciding.
- **Dump vs emit SoT:** Should `_variables.scss` chrome recipes be the sole authored surface, with dump (and optionally JS) generated from that slice — rather than a hand-maintained dump twin pinned only through tests?
