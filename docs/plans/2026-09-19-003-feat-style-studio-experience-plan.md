---
title: Style Studio Experience - Plan
type: feat
date: 2026-09-19
topic: style-studio-experience
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: session
execution: code
---

# Style Studio Experience - Plan

## Goal Capsule

**Objective:** Turn `/styles` into Style Studio with live draft + named local setups; slim Personalize to quick-apply; keep kitchen-sink parity as a secondary section on the same route.

**Product authority:** App personalization UX on top of existing `@tgmc/theme` Color/Theme APIs and `personalization.ts` SoT.

**Open blockers:** None.

**Stop:** No cloud sync; no `Theme.create` required for user setups; do not remove kitchen-sink parity; do not put full editors back into Personalize; do not invent a second visual system.

**Execution profile:** Setups SoT first → studio workbench + parity extract → thin Personalize → docs.

## Product Contract

### Summary

Ship the deferred style experience from theme color coherence: `/styles` becomes Style Studio (full slice) — live draft editing, named setups with local persistence, and Personalize as thin quick-apply that deep-links into the studio.

### Key Decisions

- **Full slice** (session-settled: user-directed) — studio + thin Personalize + named setups + live draft + local persistence.
- **`/styles` is the studio** (session-settled: user-directed) — kitchen sink demoted to Parity section on the same page.
- **User setups are app-owned snapshots** (session-settled: plan synthesis) — brand + motion + background + optional mode; Theme palette packs remain quick sources via `updateTokens`, not `Theme.create`.
- **Draft vs committed** (session-settled: plan) — studio edits with `persist: false`; Apply/Save commit flat FOUC keys; leave dirty → revert.
- **Design** (session-settled: frontend-design) — workbench + live brand triad; IBM Plex; no SaaS card kit / cream-terracotta defaults.

### Requirements

- R1. `/styles` presents Style Studio workbench first and Parity kitchen sink second.
- R2. Named setups persist in `tgmc-style-setups` / `tgmc-style-setup-active`; Apply mirrors live flat keys for FOUC.
- R3. Draft edits preview without writing storage until Apply/Save; Revert and leave-dirty discard draft.
- R4. Personalize offers mode + setup/pack quick-apply + Open studio + reset only.
- R5. Docs describe studio, draft, setups, and thin Personalize.

### Acceptance Examples

- AE1. Save setup → reload → list contains it; Apply sets active id and brand/motion/background keys.
- AE2. Draft change updates tokens; Revert restores committed prefs without writing setups.
- AE3. Personalize Open studio navigates to `/styles`; Personalize has no color pickers.
- AE4. Parity still exposes Native / Foundation / PrimeVue lanes.

### Scope Boundaries

**In scope:** setups SoT, Style Studio UI, thin Personalize, parity extract, docs/tests.

**Deferred:** cloud sync; Theme.create-backed user packs; app `--portfolio-*` Sass↔JS parity.

## Implementation Units

1. Setups + draft SoT in `core/web/shared/personalization.ts` + `personalization.spec.ts`
2. `AppStyleStudio` + `AppStylesParity` + `/styles` shell + `styles-studio.spec.ts`
3. Thin `AppPersonalize`
4. Docs: `personalization.md`, `theme.md`, `CONCEPTS.md`, this plan

## Verification Contract

- `cd core/web && npm test` (personalization + styles-studio)
- Manual: Personalize → Open studio → draft → Apply → hard refresh → Save setup → quick-apply

## Definition of Done

- Feature branch PR into `development`
- R1–R5 and AE1–AE4 satisfied
