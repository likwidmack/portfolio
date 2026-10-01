---
title: Sass to JSON Codegen (Wide) - Plan
type: feat
date: 2026-09-19
topic: sass-json-codegen
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: session
execution: code
---

# Sass → JSON Codegen (Wide) - Plan

## Goal Capsule

**Objective:** Replace the hand-copied Sass hex blob in `build-colors-json.mjs` with a dart-sass dump of all resolvable color `$` tokens (wide emit). Sass stays SoT; catalogs remain fill; no JSON → Sass.

**Stop:** No reverse Sass generation; no app `--portfolio-*` inventory; keep `--button-fg` computed in TS.

## Product decisions (locked)

- Sass → JSON wide via `scss/export/colors-dump.scss` + `sass.compile`
- Structured inventory via routing / explicit `--tv-route-*` props
- Unrouted colors → `sass` + `named` (Sass wins)
- Semver `@tgmc/theme` `0.1.0` → `0.2.0`

## Implementation

1. Dump SCSS + `sass` dependency on `@tgmc/theme`
2. Builder parse/normalize/route; delete hand `SASS = {…}`
3. Export `sassColors`; extend tokens-mirror + Color.named coverage
4. Docs / CONCEPTS / this plan; version bump

## Verification

- Theme `npm run build` + `npm test`
- Missing routed dump key fails `build:colors`
- Wide tokens (e.g. `cssRedLight`, `accentSoft`) present in `colors.json.sass` / `named`
