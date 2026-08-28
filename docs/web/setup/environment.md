# Environment Variables

Configuration reference for environment variables across Local, Development, Test, and Production.

## Environment matrix

| `SYS_ENV`     | Nitro preset  | Data store                                       | Typical trigger                                          |
| ------------- | ------------- | ------------------------------------------------ | -------------------------------------------------------- |
| `local`       | `node-server` | SQLite (`DATABASE_URL=file:./data/local.sqlite`) | Developer machine                                        |
| `development` | `node-server` | PostgreSQL                                       | Docker Compose / PR build on `development`               |
| `test`        | `aws_lambda`  | DynamoDB                                         | Push to `main` (SAM, after CI)                           |
| `production`  | `aws_lambda`  | DynamoDB                                         | GitHub Release `published` or manual `workflow_dispatch` |

Legacy `SYS_ENV=remote` is treated as `development` (`.output/development` and Postgres store selection). All four envs write `{workspaceRoot}/.output/<sysEnv>` via `scripts/nitro-output-dir.mjs`.

CI/CD triggers, Docker/SAM commands, and GitHub Environment secrets: [docs/cicd.md](../../cicd.md).

Example templates (no secrets):

- [`.env.example`](https://github.com/likwidmack/portfolio/blob/development/.env.example) — local defaults
- [`.env.development.example`](https://github.com/likwidmack/portfolio/blob/development/.env.development.example)
- [`.env.test.example`](https://github.com/likwidmack/portfolio/blob/development/.env.test.example)
- [`.env.production.example`](https://github.com/likwidmack/portfolio/blob/development/.env.production.example)

## SYS_ENV

- **Purpose**: Selects Nitro preset, build output layout, and MessageStore adapter
- **Type**: String
- **Values**: `local` | `development` | `test` | `production` (alias: `remote` → `development`)
- **Default**: `local`

```bash
SYS_ENV=local npm run build
SYS_ENV=test npm run build   # aws_lambda preset
```

## Nav env chip (`showEnvIndicator`)

- **Purpose**: Quiet primary-nav label for the current `SYS_ENV` (`runtimeConfig.public.sysEnv`)
- **Visibility**: Nuxt build-mode layers (`$development` / `$test` → on; `$production` → off), **not** `SYS_ENV`. A `NODE_ENV=production` build hides the chip even when `SYS_ENV` is `development` or `test`.
- **Public key**: `runtimeConfig.public.showEnvIndicator` (base default `false`; layers override)
- **UI**: Quiet chip at the end of `AppPrimaryNav` actions (after contact), via `resolveEnvIndicator` (`aria-label`: `Environment: <sysEnv>`). Primary links are Work / About / Gallery / Writing / Code only.

## Database / AWS (private runtimeConfig)

These map to Nuxt `runtimeConfig` private keys (`databaseUrl`, `dynamoTable`, `dynamoPostsTable`, `awsRegion`, `adminToken`). Prefer `NUXT_*` prefixes for runtime overrides (`firstNonEmptyEnv` in `core/web/resolve-process-env.ts` prefers `NUXT_*` over plain names).

Adapter selection and per-env key matrix: [docs/web/data-stores.md](../data-stores.md).

### DATABASE_URL

- **Purpose**: SQLite file URL (local) or Postgres connection string (development)
- **Local example**: `file:./data/local.sqlite`
- **Development example**: `postgres://portfolio:portfolio@postgres:5432/portfolio`
- **Runtime override**: Prefer `NUXT_DATABASE_URL` in Docker/Lambda so Nuxt replaces baked-empty `runtimeConfig.databaseUrl`. Plain `DATABASE_URL` is also honored by store adapters after empty-string normalization.
- **Note**: Nuxt may bake `databaseUrl: ''` at build time when `DATABASE_URL` is unset. Empty strings are treated as unset so process env can supply the real connection string.

### DYNAMO_TABLE

- **Purpose**: DynamoDB table name for contact messages (test / production)
- **Example (logical base)**: `Messages`
- **Runtime note**: SAM sets the **physical** name (`portfolio-test-Messages` / `portfolio-prod-Messages`) on Lambda via `!Ref`. Env examples use the logical base for `parameter_overrides` / docs only.

### DYNAMO_POSTS_TABLE

- **Purpose**: DynamoDB table name for blog posts (test / production)
- **Example (logical base)**: `Posts`
- **Aliases**: `NUXT_DYNAMO_POSTS_TABLE`
- **Runtime note**: Same as `DYNAMO_TABLE` — Lambda receives the stack-prefixed name from SAM outputs/`!Ref`.

### AWS_REGION

- **Purpose**: AWS region for DynamoDB client (canonical default for this repo: `us-west-2`)
- **Example**: `us-west-2`
- **Runtime override**: Prefer `NUXT_AWS_REGION` (SAM sets this; `AWS_REGION` is reserved/injected by Lambda). Empty baked `runtimeConfig.awsRegion` falls through to `AWS_REGION` / `NUXT_AWS_REGION` / `us-west-2`.

### ADMIN_TOKEN / NUXT_ADMIN_TOKEN

- **Purpose**: Shared secret for blog admin write APIs (`Authorization: Bearer …`)
- **Behavior**: When unset/empty, admin write routes always return `401` (fail closed). Public `runtimeConfig.public.adminWritesEnabled` is `true` for `test`/`production` builds (token expected via Lambda env); for local/development it reflects whether a token was present at build time. Never exposes the secret.
- **Local usage**: set in `.env`, open `/admin`, paste the token (stored in `sessionStorage` for the browser session), then manage posts at `/admin/blog`.
- **Test/prod**: set GitHub Environment secret `NUXT_ADMIN_TOKEN` (wired into SAM `AdminToken` → Lambda env).
- **Example**: `ADMIN_TOKEN=change-me-local`

### CORS_ALLOW_ORIGIN

- **Purpose**: HTTP API CORS `AllowOrigin` for SAM stacks (parameter `CorsAllowOrigin`)
- **Type**: String
- **Default**: `*` (local/test convenience)
- **Production**: `https://likwidmack.com` — must match `SITE_URL` / `NUXT_PUBLIC_SITE_URL` (GitHub Environment var `CORS_ALLOW_ORIGIN` → SAM `CorsAllowOrigin`). No trailing slash. Leaving `*` widens blast radius if a browser client ever sends `Authorization`.

## CDN Configuration

### NUXT_APP_CDN_URL

- **Purpose**: Base URL for CDN / static asset origin (S3 HTTPS or CloudFront)
- **Type**: String (absolute `http://` or `https://` origin only)
- **Default**: Empty (no CDN rewrite; Lambda package does not include `.output/public`)
- **Example**: `https://portfolio-test-assets-ACCOUNT.s3.us-west-2.amazonaws.com`
- **Usage**: Set **before building** so Nuxt `app.cdnURL` rewrites hashed assets. CD derives the S3 URL when the GitHub var is unset.
- **Invalid locally**: do not set relative values such as `./` or bare hosts — those are ignored and must never be used as `vite.base` (they break absolute routes like `/admin/blog`).

```bash
NUXT_APP_CDN_URL=https://cdn.example.com npm run build
```

## Node Environment

### NODE_ENV

- **Purpose**: Node.js environment mode
- **Type**: String
- **Values**: `development`, `production`
- **Default**: Set by npm scripts
- **Usage**: Affects optimization and debug features

```bash
NODE_ENV=production npm run build
```

Canonical runtime for CI/CD/Docker/SAM is **Node.js 24** (see [docs/cicd.md](../../cicd.md)).

## Deployment

### DEPLOYMENT

- **Purpose**: Deployment target configuration
- **Type**: String
- **Values**: `client`, `server` (legacy docs may mention `remote`)
- **Default**: `client`
- **Usage**: Determines build output and runtime behavior

```bash
DEPLOYMENT=server npm run build
```

## Development Server

### HOST

- **Purpose**: Public hostname identity for local / Docker (bind address is often `0.0.0.0` via `DOCKER_BIND_HOST`)
- **Type**: String
- **Local default**: `tgmc-portfolio.local` (`.env.example`)
- **Docker development default**: `tgmc-portfolio.test` (`.env.development.example`)
- **Do not use `*.dev`**: the `.dev` TLD is HSTS-preloaded; browsers refuse self-signed certificate exceptions
- **Example**: `HOST=tgmc-portfolio.test`

### PORT

- **Purpose**: Server port number
- **Type**: Number
- **Default**: `4200`
- **Example**: `3000`

```bash
HOST=0.0.0.0 PORT=4200 npm run dev
```

Map `tgmc-portfolio.local` / `tgmc-portfolio.test` → `127.0.0.1` in the hosts file when using those names.

## Nx Cloud

### NX_CLOUD_ACCESS_TOKEN

- **Purpose**: Authenticates Nx CLI to [Nx Cloud](https://cloud.nx.app) for remote build/test/lint cache
- **Type**: String (secret)
- **Workspace**: `nx.json` → `nxCloudId`
- **Local**: Optional — set in `.env` (or shell) so `nx` / `npm run dev` can read/write the remote cache
- **CI**: **Required** — GitHub repository secret `NX_CLOUD_ACCESS_TOKEN` (see [docs/cicd.md](../../cicd.md))

Create a token in Nx Cloud → your workspace → **Access Tokens**. Do not commit real tokens to `.env.example`.

```bash
# Local (after copying token into .env or exporting)
export NX_CLOUD_ACCESS_TOKEN=your-token
npm run test
```

```bash
# GitHub Actions (one-time)
gh secret set NX_CLOUD_ACCESS_TOKEN --body "your-token"
```

## HTTPS

### HTTPS

- **Purpose**: Enable HTTPS/SSL
- **Type**: Boolean (1/0)
- **Default**: 0
- **Usage**: Requires SSL certificates in `bin/ssl/`

```bash
HTTPS=1 npm run dev
```

### SSL_CERT

- **Purpose**: Custom SSL certificate path
- **Type**: String
- **Default**: `bin/ssl/localhost.crt` (via `core/web/bin/ssl/`)

### SSL_KEY

- **Purpose**: Custom SSL key path
- **Type**: String
- **Default**: `bin/ssl/localhost.key`

```bash
HTTPS=1 SSL_CERT=/path/to/cert.crt SSL_KEY=/path/to/key.key npm run dev
```

## Common Combinations

### Local (SQLite)

Copy `.env.example` to `.env` (defaults: `SYS_ENV=local`, `DATABASE_URL=file:./data/local.sqlite`). The SQLite file lives under `data/` (gitignored).

```bash
npm run db:migrate:local
SYS_ENV=local DATABASE_URL=file:./data/local.sqlite ADMIN_TOKEN=change-me-local npm run dev
```

Public blog: `/blog`. Admin: `/admin` → `/admin/blog`.

### Development (Postgres / Docker)

```bash
SYS_ENV=development DATABASE_URL=postgres://portfolio:portfolio@localhost:5432/portfolio npm run start
```

### Test / Production build (Lambda)

```bash
SYS_ENV=test NODE_ENV=production DEPLOYMENT=server npm run build
SYS_ENV=production NODE_ENV=production DEPLOYMENT=server npm run build
```

### Development (With CDN)

```bash
NUXT_APP_CDN_URL=https://cdn.example.com npm run dev
```

### HTTPS Development

```bash
npm run start:ssl:4200
```

## Related Files

- `.env.example` / `.env.*.example` — environment templates
- `nuxt.config.ts` — Nitro preset + runtimeConfig wiring
- `server/db/` — MessageStore / BlogPostStore adapters selected by `SYS_ENV`
- `package.json` — npm scripts

## See Also

- [CDN Guide](../features/cdn-guide.md)
- [SSL Setup](./ssl-setup.md)
- [Quick Start](../guides/quickstart.md)
