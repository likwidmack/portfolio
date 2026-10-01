---
title: 'Pug templates: imports used only in the template get stripped'
date: 2026-09-23
category: build-errors
module: 'core/web, core/admin Vue SFCs with lang="pug"'
problem_type: build_error
component: development_workflow
severity: high
applies_when:
  - 'A `<script setup>` import (constant, helper, enum list) is referenced only from a Pug template'
  - 'Running `eslint --fix` or the pre-commit hook (lint-staged runs ESLint --fix)'
tags:
  - pug
  - script-setup
  - eslint
  - unused-imports
---

# Pug templates: imports used only in the template get stripped

## Symptom

A component renders an empty list, or SSR warns that a property is missing on `_ctx`, right after a commit. The import that feeds the template (for example `BACKGROUND_MODES`) has disappeared from `<script setup>`.

## Cause

ESLint's unused-import handling (and `<script setup>` unused-import elision) cannot see identifiers referenced inside a **Pug** template. An import used only from Pug looks unused, so `eslint --fix` — which the pre-commit hook runs through lint-staged — deletes it.

## Fix

Bind the value in script and reference the local binding from the template:

```ts
import { BACKGROUND_MODES } from '#shared/personalization';

/** Script-bound so Pug-only usage survives unused-import auto-fix. */
const backgroundOptions = BACKGROUND_MODES;
```

```pug
label(v-for="option in backgroundOptions", :key="option.value")
```

Same for helper functions (`const sizeLabel = (bytes: number) => formatBytes(bytes);`) and for computed values that call imported helpers (see `gridTiles` in `pages/gallery/index.vue`).

## Prevention

- Never reference an import directly from a Pug template; always go through a `const`, `computed` or function declared in `<script setup>`.
- After `eslint --fix` (or a commit), grep the SFC for the identifiers the template uses.
- Source-string tests (`core/web/tests/*.spec.ts`) that assert the local binding name catch a regression before render.
