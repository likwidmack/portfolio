# Project Structure

Organization of the Nuxt application `@tgmc/web` (`core/web`).

Canonical documentation lives in the **repo** [`docs/`](../../) tree (not under `core/web/docs/`). In-app `/docs` reads that tree in place — see [gallery-and-docs.md](../features/gallery-and-docs.md) and `shared/docs-source.ts`.

## Directory overview

```
core/web/
├── app/                      # Vue application (Nuxt 4 app/ dir)
│   ├── components/
│   ├── composables/
│   ├── layouts/
│   ├── pages/
│   ├── plugins/
│   ├── utils/
│   ├── app.vue
│   └── error.vue
├── assets/                   # CSS / static assets bundled by Vite
├── bin/                      # Dev helpers (SSL generation)
├── config-properties/        # Nuxt config delegates
├── content/                  # Nuxt Content collections (gallery JSON, etc.)
│                             # — do NOT put repo docs markdown here
├── content.config.ts         # Content collections; docs cwd = REPO_DOCS_DIR
├── layers/                   # Auto-scanned Nuxt layers (e.g. 1.base)
├── public/                   # Public static files
├── server/                   # Nitro API, middleware, DB adapters
├── services/                 # App services (storage shims, etc.)
├── shared/                   # Shared utilities (CDN, docs-source, syntax, …)
├── types/                    # TypeScript definitions / Nuxt augmentations
├── tests/                    # Vitest specs
├── examples/                 # Code examples
├── nuxt.config.ts
├── package.json
├── tsconfig*.json
└── vitest.config.ts
```

Workspace theme and libs sit **outside** this package: `theme/core` (`@tgmc/theme`), `packages/*`.

## Key files

### Configuration

- `nuxt.config.ts` — aliases, Nitro preset, runtimeConfig, CDN
- `content.config.ts` — Content collections (docs → repo `docs/`)
- `tsconfig.app.json` — compiler options / paths
- `vitest.config.ts` — Vitest
- `eslint.config.mjs` — lint
- `package.json` — package scripts (`preview` is here; root uses Nx `npm run build` / `dev`)

### Type system

- `types/` — module augmentations and shared types
- See [types.md](./types.md) and [typescript-config.md](./typescript-config.md)

### Application code

- `app/` — components, pages, composables, plugins, layouts
- `app/components/AppPrimaryNav.vue` — primary rail: Work / About / Gallery / Writing / Code
- `app/components/AppWorkSubNav.vue` + `shared/work-sub-nav.ts` — Docs / AI Lab / Process under Work (`.page-nav`)
- `app/components/AppPageNav.vue` — on-page hash scroll-spy (About, docs groups, product, styles)
- `layers/1.base` — shared Nuxt layer leaf (auto-scanned; do not also `extends` it)
- `server/` — public/server API and middleware
- `shared/` — isomorphic helpers (`docs-source`, `work-sub-nav`, CDN, syntax, …)

## Import aliases

| Alias         | Path               | Usage              |
| ------------- | ------------------ | ------------------ |
| `#shared`     | `./shared`         | Shared utilities   |
| `#types`      | `./types`          | Types (optional)   |
| `@tgmc/theme` | `theme/core/dist`  | Theme tokens       |
| `theme`       | `../../theme/core` | Theme source alias |

Full path map: [typescript-config.md](./typescript-config.md).

## CDN structure

- `app/plugins/cdn.server.ts` / `cdn.client.ts`
- `app/composables/useCdn.ts` (or `#shared` CDN helpers)
- `shared/utils/cdn.ts`
- `server/middleware/cdn.ts`
- Types under `types/nuxt/`

## Nuxt layers

- **Local (auto-scanned):** `layers/1.base` — thin shared shell. Nuxt scans `layers/`; do not also list those paths in `extends` (double-merge).
- **Publishable (workspace):** `@tgmc/web-layer-admin` (`packages/web-layer-admin`) — admin pages/APIs. Wired via `extends: ['@tgmc/web-layer-admin']`.

Marketing/blog pages stay under `app/pages/`. Admin token runtime config stays in the app root.

## Workspace packages

Build with `npm run build:libs` or `npm run build --workspace=@tgmc/<name>`:

| Package                 | Docs / README                                        |
| ----------------------- | ---------------------------------------------------- |
| `@tgmc/utilities`       | [packages/utilities.md](../../packages/utilities.md) |
| `@tgmc/theme`           | [packages/theme.md](../../packages/theme.md)         |
| `@tgmc/media-player`    | `packages/media-player/README.md`                    |
| `@tgmc/likwidlibs`      | `packages/likwidlibs/README.md`                      |
| `@tgmc/web-layer-admin` | Package README / layer notes above                   |

## Testing

- App Vitest: `core/web/tests/`, `server/**/*.spec.ts`
- Page-fit contract: `tests/page-fit.spec.ts`
- Docs packaging: `tests/docs-source.spec.ts`
- E2E: `core/web-e2e/` (Cypress)

## Documentation structure

| Location                 | Role                                            |
| ------------------------ | ----------------------------------------------- |
| `docs/` (repo root)      | Canonical runbooks; in-app `/docs` source       |
| `docs/web/`              | App guides, features, setup, reference          |
| `docs/packages/theme.md` | Theme tokens, `data-fit`, ratios, container fit |
| `core/web/content/`      | Content collections only — **no** docs markdown |

## Getting started

1. Install (repo root): `npm ci` then `npm run db:migrate:local`
2. Develop: `npm run dev` → `http://localhost:4200`
3. Build: `npm run build`
4. Test: `npm test`
5. Preview built app: `cd core/web && npm run preview` (after a build)

See [Quick Start](../guides/quickstart.md).
