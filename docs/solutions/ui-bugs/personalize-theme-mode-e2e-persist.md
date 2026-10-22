---
title: 'Personalize / Style Studio theme mode e2e: light not applied'
date: 2026-09-30
category: ui-bugs
module: 'core/web/app/composables/usePersonalization.ts, core/web-e2e'
problem_type: ui_bug
component: theme_mode_persist
severity: medium
applies_when:
  - 'Changing Preferences applyPatch / setMode / commitLive colour-mode wiring'
  - 'Full regression e2e fails on app.cy personalize or style-studio mode switch'
tags: [personalize, style-studio, theme-mode, cypress, preferences]
---

# Theme mode e2e: light stays dark / localStorage null

## Symptom

On a PR into `main` (Full regression):

- `app.cy.ts` `persists personalization…` — `tgmc-theme-mode` stays `null` after choosing Light.
- `style-studio.cy.ts` colour flow — after clicking Light, `data-theme` stays `dark`.

Local parity on `development` does not run these specs, so the regression can sit until a promote.

## Cause

1. **Preferences deepen** routed `setMode` through `applyPatch` → `setThemeMode(..., { persist: false })` always. Personalize must let Theme write `tgmc-theme-mode` when persisting; commit should run before the Theme write so a stale `mode: 'system'` cannot clear the key.
2. **Visually-hidden radio + Vue `:checked`**: Cypress `.check()` / label activation can flip the DOM `checked` property without `update:modelValue`. `be.checked` then passes while `setMode` never runs — or `setMode` sets `mode.value` eagerly and `Preferences.preview` paint throws before `commit` / `setThemeMode`, leaving storage null / `data-theme` dark.
3. **Vue reactive proxies in the Preferences draft**: `applyPatch` passes `brandRoles.value` (a `useState` proxy) into `Preferences.preview`. Merging the patch with `{ ...clone(draft), ...patch }` left the proxy on `draft`. The next `structuredClone` (getDraft / commit / later preview) throws `DataCloneError`, so Grid `setBackground` never sticks and Style Studio Apply never writes `tgmc-theme-color-tokens` — while early `setThemeMode` can still make Light look green.

## Fix

- `UiRadio`: native radio; explicit `select()` from box/input (no cross-instance radio `v-model`).
- Personalize / Style Studio / BackgroundPicker labels: `@click.prevent` + `:for` → `setMode` / `onPick` / `radioModel`.
- `setMode` / `setBackground`: eager UI state; seed Preferences + `setThemeMode` **before** brand-role paint where needed.
- `Preferences.preview` / `commit` / `discard`: paint failures are caught; `cloneDocument` falls back to JSON; preview deep-clones the merged patch so proxies never linger in `draft`.
- `applyPatch`: `Preferences.commit` then `setThemeMode(..., { persist })`; `commitLive` persists mode via Theme.
- e2e: label / native `.check({ force: true })` for Grid after Light settles; storage + `data-theme`.
- Unit: paint-throw still commits mode; reactive `brandRoles` preview → mode → commit writes `--theme-primary-light-color`.

## Verify

`npm run e2e:regression` — `app.cy.ts` personalization and `style-studio.cy.ts` colour flow.
