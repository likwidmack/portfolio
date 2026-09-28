---
title: 'Nx local cache hit clears @tgmc/utilities dist (Nitro ENOENT)'
date: 2026-09-24
category: build-errors
module: 'CI Local parity (.github/workflows/ci.yml), @tgmc/web:build, @tgmc/utilities'
problem_type: build_error
component: cicd
severity: high
applies_when:
  - 'CI runs Development Nuxt (SYS_ENV=development) then Affected test/build (SYS_ENV=local) in the same job'
  - '@tgmc/web:build fails with ENOENT on packages/utilities/dist/index.js after a utilities:build local cache hit'
  - 'Vitest for web still passes (tgmc-portfolio export condition resolves to src)'
tags:
  - nx
  - nx-cloud
  - utilities
  - nitro
  - ci
---

# Nx local cache hit clears `@tgmc/utilities` dist (Nitro ENOENT)

## Symptom

Local parity **Development Nuxt build** succeeds, then **Affected test, build** fails on `@tgmc/web:build`:

```text
[error] [nitro] Error: ENOENT: no such file or directory, lstat '.../packages/utilities/dist/index.js'
```

Nx reports `@tgmc/utilities:build` as a **Local Cache Hit**. `@tgmc/web:test` may still pass because package exports prefer `tgmc-portfolio` → `src` under Vitest.

## Cause

In one CI job the sequence is:

1. `npm run build:libs` writes `packages/utilities/dist` via workspace `tsc`.
2. Development Nuxt runs `nx run @tgmc/web:build` (`SYS_ENV=development`); `@tgmc/utilities:build` is a **remote** cache hit and Nitro succeeds.
3. Affected runs `nx affected -t test,build` (`SYS_ENV=local`). `@tgmc/utilities:build` is then a **local** cache hit that clears `packages/utilities/dist` without restoring files.
4. Nitro resolves `@tgmc/utilities` to `dist/index.js` and fails.

## Fix

Before Affected in `.github/workflows/ci.yml`:

```bash
npx nx reset
npm run build:libs
npx nx affected -t test,build --parallel=3
```

`nx reset` drops the poisoned in-job local cache; `build:libs` recreates `dist` for Nitro. Guarded by `scripts/cicd-workflow-policy.test.mjs`.
