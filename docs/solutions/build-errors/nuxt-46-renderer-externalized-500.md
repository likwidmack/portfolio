---
title: 'Nuxt 4.6 node-server returns 500 "Either manifest or precomputed data must be provided"'
date: 2026-10-14
category: build-errors
module: 'core/admin (@tgmc/admin), core/web (@tgmc/web) built servers'
problem_type: runtime_error
component: bundling
severity: critical
applies_when:
  - 'A Nuxt 4.6+ app builds with nitropack 2 (`node-server` or `aws_lambda`)'
  - 'Its `nitro.externals.inline` does not list `nuxt`'
tags:
  - nitro
  - nuxt
  - externals
  - primevue
  - docker
---

# Nuxt 4.6 node-server returns 500 "Either manifest or precomputed data must be provided"

## Symptom

After the Nuxt 4.5 → 4.6 bump (#258), the Docker admin (`npm run docker:admin`, `http://127.0.0.1:4400/admin`) answered every page with 500 and its healthcheck reported `unhealthy`. The container log showed:

```text
H3Error: Either manifest or precomputed data must be provided
    at createRendererContext (.../server/node_modules/vue-bundle-renderer/dist/runtime.mjs)
    at .../server/node_modules/nuxt/dist/runtime/server/renderer/build-files.js
```

`.output/admin/server/chunks/` had no `build/` or `virtual/` chunks, and `.output/admin/server/node_modules/nuxt` existed.

## Cause

Nuxt 4.6 moved the SSR renderer behind bare `nuxt/internal/*` specifiers (`nuxt/internal/renderer`, `…/manifest`, `…/precomputed`, `…/entry`). `@nuxt/nitro-server` registers the build artifacts as Nitro virtual modules under those names, which only works while the renderer is part of the Rollup graph.

Nitro 2's externals plugin matches `externals.inline` against the **import string**, not the resolved path. Nuxt's own inline list has `nuxt/dist`, which never matches `nuxt/internal/renderer`, so the renderer was traced into `server/node_modules/nuxt`. At runtime that copy imports the package's stub `nuxt/internal/precomputed` (no manifest) instead of the build's virtual module.

With `nuxt` inlined, a second split shows up on PrimeVue pages: some `@primeuix/utils/*` subpaths were bundled and others external, so `/` failed with `'@primeuix/utils/classnames' does not provide an export named 'mergeKeys'`.

## Fix

`nitro.externals.inline` lists `nuxt` and `@primeuix/utils` in both apps:

- `core/web/nuxt.config.ts` — added in #262.
- `core/admin/nuxt.config.ts` — added later (this note); admin already inlined `@tgmc/web-layer-admin` and `@tgmc/media-nuxt`.
- Regression test: `core/admin/tests/nitro-externals.spec.ts`.

`ensureAdminNitroOutput` (`scripts/prepare-nitro-output.mjs`) only builds when `.output/admin/server/index.mjs` is missing, so a stale broken build survives `npm run docker:admin`. Rebuild first:

```bash
npm run build --workspace=@tgmc/admin
npm run docker:admin
```

## Prevention

- A Nuxt app config in this repo that sets `nitro.externals` keeps `nuxt` and `@primeuix/utils` in `inline`.
- After a Nuxt/Nitro upgrade, smoke-test every **built** server (`.output/<env>` and `.output/admin`), not only `nuxt dev`.
- A healthy build has no `server/node_modules/nuxt`; if it appears, the renderer was externalized.
