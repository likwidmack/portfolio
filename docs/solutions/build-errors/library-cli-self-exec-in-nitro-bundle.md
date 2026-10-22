---
title: 'Library CLI "run if main" guard fires inside a Nitro bundle and exits the server'
date: 2026-09-28
category: build-errors
module: 'packages/media (@tgmc/media), core/admin built server'
problem_type: runtime_error
component: bundling
severity: critical
applies_when:
  - 'A workspace library module checks `import.meta.url` against `process.argv[1]` to decide whether to run as a CLI'
  - 'That module is reachable from the package entry and gets bundled by Nitro / Rollup into `.output/*/server`'
tags:
  - nitro
  - import-meta
  - cli
  - process-exit
  - media
---

# Library CLI "run if main" guard fires inside a Nitro bundle and exits the server

## Symptom

The built admin app (`node .output/admin/server/index.mjs`) starts fine, but the first request to `/admin/media` prints the `Usage: tgmc-media <command> [options]` banner and the process exits with code 1. Every other route keeps working until then. `nuxt dev` does not reproduce it.

## Cause

`packages/media/src/cli.ts` ended with a direct-execution guard:

```ts
const isDirect = fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirect) runCli(process.argv.slice(2)).then((code) => process.exit(code));
```

`cli.ts` is re-exported from the package entry (`export { runCli }`), so any server file importing `@tgmc/media` pulls it into a Nitro chunk. Nitro rewrites `import.meta` in chunks to `globalThis._importMeta_`, which `server/index.mjs` sets to **its own** `import.meta.url` — exactly `process.argv[1]`. The guard is therefore true in every chunk. When `/admin/media` lazily loads the media chunk, the CLI runs with no arguments, prints usage and calls `process.exit(1)`.

## Fix

- The executable entry is `packages/media/bin/media.mjs` only (it imports `dist/cli.js`, awaits `runCli()` and owns `process.exit`).
- `src/cli.ts` exports `runCli(argv): Promise<number>` and has no import-time side effects and no `process.exit`.
- Regression test: `packages/media/tests/cli-import.spec.ts` imports `src/cli` and `src/index` with `process.argv[1]` pointing at the module and asserts nothing is logged and `process.exit` is never called; it also fails if any `src/**/*.ts` calls `process.exit(`.

## Prevention

- Never put "am I main?" guards in library `src/`. Put CLIs in a `bin/*.mjs` launcher (see `@tgmc/media` `package.json` `bin`).
- Library code throws or returns an exit code; only the bin launcher calls `process.exit`.
- `import.meta.url` is not a reliable module identity after bundling — do not compare it to `process.argv`.
- Smoke-test the **built** server (`node .output/admin/server/index.mjs`) and hit lazily-loaded routes, not just `/`.
