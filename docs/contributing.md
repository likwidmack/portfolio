# Contributing

## Documentation

1. Put durable instructions under [`docs/`](./), categorized by directory (see the catalog).
2. Link new pages from `docs/README.md` **and** `docs/_catalog.md` (GitHub Pages include).
3. Keep the [root README](https://github.com/likwidmack/portfolio#readme) short: badges, one quick start, links into `docs/`.
4. GitHub **About**, **topics**, and **Website** should stay aligned with `package.json` `description`, `homepage`, and `keywords`.
5. Package READMEs (`packages/*`) stay operational or package-local; they should point here for topology.

### Whenever documentation is altered

Treat every docs edit (new page, rewrite, or behavior change reflected in markdown) as a **content sync**, not a drive-by typo fix:

1. **Review related docs** — update cross-links, catalogs (`docs/README.md`, `docs/_catalog.md`), and any hub that points at the page (`docs/web/README.md`, `docs/packages/README.md`).
2. **Review inline comments / JSDoc** in the code the page describes; keep file headers and token comments aligned with the written contract (or delete stale comments).
3. **In-app `/docs`** — markdown under repo `docs/` is ingested in place (`core/web/shared/docs-source.ts`). Editing those files **is** updating docs content; do not copy into `core/web/content/`. Rebuild the web app when you need the Content dump refreshed.

## Code

- Node **>=24** (`.nvmrc`).
- Format + lint: `npm run lint`.
- Tests: `npm test`.

## Pull requests

- PRs into `main` run [Tests](https://github.com/likwidmack/portfolio/actions/workflows/test.yml) (`node --test tests/*.test.mjs`).
- `npm test` runs Nx package tests locally when dependencies are installed.

## Security

Report vulnerabilities privately. See [SECURITY.md](../SECURITY.md).
