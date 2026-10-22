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

In `.github/workflows/ci.yml` Affected step:

```bash
npx nx reset
npm run build:libs
npx nx affected -t test,build --parallel=3 --exclude=@tgmc/web
# when @tgmc/web is affected:
npm run build --workspace=@tgmc/theme
npx nx run @tgmc/web:test
npx nx run @tgmc/web:build
```

`nx reset` drops the poisoned in-job local cache; `build:libs` recreates `dist` for Nitro; web runs alone after a theme rebuild so parallel theme cache restores cannot clear `theme/core/dist` mid-Nitro. Guarded by `scripts/cicd-workflow-policy.test.mjs`.

## Also hits the theme (2026-10-06)

The same in-job race showed up for `@tgmc/theme`. During the web prerender, Nitro failed with `ENOTDIR: stat '.../theme/core/dist/theme-presets.json/package.json'` (PR #253, and earlier as `Cannot find module …/@tgmc/theme/dist/index.js`, PRs #208 / #229). The cause was that `build:libs` did not build the theme, so `nx affected` rebuilt it while the web prerender was already reading `theme/core/dist`. `build:libs` now builds `@tgmc/theme` first, before `@tgmc/image`, which imports it, so CI's pre-affected step leaves a complete theme `dist` in place.

## Theme remote-cache race during parallel Affected (2026-10-16)

Even with theme in `build:libs`, `@tgmc/web:build` still intermittently fails mid-Nitro with:

```text
[error] [nitro] Error: ENOENT: no such file or directory, lstat '.../theme/core/dist/index.js'
```

while `@tgmc/theme:build` is a **remote** cache hit in the same `nx affected -t test,build --parallel=3` graph (PR #290 run 38925552828; earlier #276 / #208 / #229 / #253). No parallel task writes `theme/core/dist`; the restore of theme outputs races with Nitro reading them.

**Fix:** exclude `@tgmc/web` from the parallel Affected run, rebuild `@tgmc/theme`, then run `@tgmc/web:test` and `@tgmc/web:build` alone when web is affected. Guarded by `scripts/cicd-workflow-policy.test.mjs`.
