# @tgmc/likwidlibs

Nx workspace plugin and generators for TGMC packages (`lib-gen`).

**Docs hub:** [`docs/packages/README.md`](../../docs/packages/README.md) · catalog [`docs/README.md`](../../docs/README.md)

## Build

```bash
npm run build --workspace=@tgmc/likwidlibs
# or from this directory:
npm run build
```

Build runs `tsc` then copies non-TypeScript generator assets (`schema.json`, templates) into `dist/`.

## Test

```bash
npx nx test likwidlibs
```

## Publish (manual, not CI)

Packages are publish-ready but not wired to a registry workflow yet.

```bash
npm run build
npm pack --dry-run   # expect dist/, generators.json, and generator templates
# npm publish         # when ready (requires npm org access for @tgmc)
```
