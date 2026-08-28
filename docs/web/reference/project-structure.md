# Project Structure

Organization of the Nuxt application.

## Directory Overview

```
core/web/
├── app/                        # Vue application
│   ├── components/            # Vue components
│   ├── composables/           # Composables & hooks
│   ├── pages/                 # Page routes
│   ├── plugins/               # Nuxt plugins
│   ├── layouts/               # Page layouts
│   ├── app.vue                # Root component
│   └── error.vue              # Error page
├── types/                     # TypeScript definitions
│   ├── nuxt/                 # Module augmentations
│   │   ├── cdn.d.ts
│   │   ├── theme-tokens.d.ts
│   │   └── toast.d.ts
│   └── README.md
├── server/                    # Server-side code
│   ├── api/                  # API routes
│   ├── middleware/           # Server middleware
│   └── utils/                # Server utilities
├── shared/                    # Shared code
│   ├── utils/                # Utility functions
│   ├── theme/                # Theme utilities
│   └── syntax/               # Syntax highlighting
├── plugins/                   # Nuxt plugins
│   ├── cdn.server.ts
│   ├── cdn.client.ts
│   └── ...
├── composables/              # Global composables
│   ├── useCdn.ts
│   └── ...
├── config-properties/        # Configuration
├── assets/                   # Static assets
│   ├── images/
│   ├── styles/
│   └── other/
├── public/                   # Public files
├── examples/                 # Code examples
├── tests/                    # Test files
├── docs/                     # Documentation (NEW)
│   ├── README.md
│   ├── guides/
│   ├── features/
│   ├── setup/
│   └── reference/
├── bin/                      # Scripts & tools
│   ├── ssl/                 # SSL certificates
│   └── generate-ssl-*
├── nuxt.config.ts           # Nuxt configuration
├── tsconfig.app.json        # TypeScript config
├── tsconfig.json            # Root TypeScript config
├── package.json             # Dependencies & scripts
└── vitest.config.ts         # Test configuration
```

## Key Files

### Configuration

- `nuxt.config.ts` - Nuxt app configuration
- `tsconfig.app.json` - TypeScript compiler options
- `vitest.config.ts` - Test runner configuration
- `eslint.config.mjs` - Linting rules
- `package.json` - Scripts and dependencies

### Type System

- `types/nuxt/` - Module augmentations
- `types/README.md` - Type organization guide
- `tsconfig.app.json` - Path aliases

### Application Code

- `app/` - Vue components, pages, composables, plugins
- `layers/1.base` - Shared Nuxt layer (leaf; auto-scanned)
- `server/` - Public/server API and middleware (non-admin)
- `shared/utils/` - Shared utilities
- `config-properties/` - Nuxt config delegates

## Import Aliases

| Alias         | Path          | Usage            |
| ------------- | ------------- | ---------------- |
| `#shared`     | `./shared`    | Utilities        |
| `#types`      | `./types`     | Types (optional) |
| `@tgmc/theme` | Theme package | Theme tokens     |

## CDN Structure

CDN support files:

- `app/plugins/cdn.server.ts` - Server plugin
- `app/plugins/cdn.client.ts` - Client plugin
- `app/composables/useCdn.ts` - Vue composable
- `shared/utils/cdn.ts` - Utilities
- `server/middleware/cdn.ts` - Cache headers
- `types/nuxt/cdn.d.ts` - Type definitions

## Nuxt layers

- **Local (auto-scanned):** `layers/1.base` — thin shared shell leaf. Nuxt scans `layers/`; do not also list those paths in `extends` (double-merge).
- **Publishable (workspace package):** `@tgmc/web-layer-admin` (`packages/web-layer-admin`) — admin pages (`/admin`), write APIs (`/api/admin`), and admin auth helpers. Wired via `extends: ['@tgmc/web-layer-admin']` (`@tgmc/web` depends on the package).

Marketing/blog pages stay under `app/pages/`. Admin token runtime config stays in the app root.

## Workspace packages

- `@tgmc/web-layer-admin` — see Nuxt layers above
- Publish-ready libs (not wired into `@tgmc/web` yet). Build with `npm run build --workspace=@tgmc/<name>`; publish is manual (`npm pack` / `npm publish`) — no CI publish workflow.
  - `packages/utilities` (`@tgmc/utilities`)
  - `packages/media-player` (`@tgmc/media-player`)
  - `packages/likwidlibs` (`@tgmc/likwidlibs`)

## Testing Structure

- `tests/shared/cdn.spec.ts` - CDN utilities tests
- `vitest.config.ts` - Vitest configuration
- Admin auth specs: `tests/web-layer-admin/admin-auth.spec.ts` (covers `@tgmc/web-layer-admin`)

## Documentation Structure

- Repo/infra: `docs/cicd.md`, `docs/superpowers/`
- App developer guides: `docs/web/` (`guides/`, `setup/`, `features/`, `reference/`)

## Getting Started

1. Install: `npm install`
2. Develop: `npm run dev`
3. Build: `npm run build`
4. Test: `npm run test`

See [Quick Start](../guides/quickstart.md) for more.
