# Environment Variables

Configuration reference for environment variables across Local, Development, Test, and Production.

This public tree documents how `@tgmc/web` selects Nitro presets and store adapters. Docker Compose and SAM templates are not in this checkout; `SYS_ENV` still drives the same adapter matrix in app code.

## Environment matrix

| `SYS_ENV`     | Nitro preset  | Data store                                       | Typical use                                              |
| ------------- | ------------- | ------------------------------------------------ | -------------------------------------------------------- |
| `local`       | `node-server` | SQLite (`DATABASE_URL=file:./data/local.sqlite`) | Developer machine                                        |
| `development` | `node-server` | PostgreSQL                                       | Postgres-backed node server                              |
| `test`        | `aws_lambda`  | DynamoDB                                         | Lambda + DynamoDB (test)                                 |
| `production`  | `aws_lambda`  | DynamoDB                                         | Lambda + DynamoDB (production)                           |

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

These map to Nuxt `runtimeConfig` private keys (`databaseUrl`, `dynamoTable`, `dynamoPostsTable`, `awsRegion`). Prefer `NUXT_*` prefixes for runtime overrides (`firstNonEmptyEnv` in `core/web/resolve-process-env.ts` prefers `NUXT_*` over plain names).

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

- **Purpose**: Shared secret for Docker-only admin APIs (`Authorization: Bearer …`) on `@tgmc/admin`
- **Behavior**: When unset/empty, admin routes return `401` (fail closed). Not used by the public `@tgmc/web` app.
- **Local usage**: set in `.env` / `.env.development` / `.env.test`, run `npm run docker:*:admin`, open `http://127.0.0.1:4400/admin`, paste the token (stored in `sessionStorage`).
- **Example**: `ADMIN_TOKEN=change-me-local`
- **See**: [admin.md](../features/admin.md)

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

Canonical runtime is **Node.js 24** (`.nvmrc`).

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
- **Local default**: `tgmc-portfolio.local`
- **Development default**: `tgmc-portfolio.test`
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
- **Workspace**: optional Nx Cloud remote cache
- **Local**: Optional — set in `.env` (or shell) so `nx` / `npm run dev` can read/write the remote cache
- **CI**: optional GitHub Actions secret `NX_CLOUD_ACCESS_TOKEN`

Create a token in Nx Cloud → your workspace → **Access Tokens**. Do not commit real tokens.

```bash
# Local (after copying token into .env or exporting)
export NX_CLOUD_ACCESS_TOKEN=your-token
npm run test
```

## HTTPS

### HTTPS

- **Purpose**: Enable HTTPS/SSL
- **Type**: Boolean (1/0)
- **Default**: 0
- **Usage**: Requires SSL certificates in `core/web/bin/ssl/`

```bash
HTTPS=1 npm run dev
```

### SSL_CERT

- **Purpose**: Custom SSL certificate path
- **Type**: String
- **Default**: `core/web/bin/ssl/localhost.crt`

### SSL_KEY

- **Purpose**: Custom SSL key path
- **Type**: String
- **Default**: `core/web/bin/ssl/localhost.key`

```bash
HTTPS=1 SSL_CERT=/path/to/cert.crt SSL_KEY=/path/to/key.key npm run dev
```

## Common Combinations

### Local (SQLite)

Set `SYS_ENV=local` and `DATABASE_URL=file:./data/local.sqlite` (or a gitignored `.env`). The SQLite file lives under `data/` (gitignored).

```bash
npm run db:migrate:local
SYS_ENV=local DATABASE_URL=file:./data/local.sqlite npm run dev
```

Public blog: `/blog`. Admin (Docker only): `npm run docker:admin` → `http://127.0.0.1:4400/admin`.

### Development (Postgres)

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

- [CDN examples](../guides/examples.md)
- [SSL Setup](./ssl-setup.md)
- [Quick Start](../guides/quickstart.md)
