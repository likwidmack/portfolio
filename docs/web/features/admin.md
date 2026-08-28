# Docker-only admin

The portfolio admin UI runs **only** via the standalone Docker admin stack. It is not bundled into `@tgmc/web`, `npm run dev`, or AWS Lambda.

**Package README:** `core/admin/README.md` · **Layer:** [`packages/web-layer-admin/README.md`](../../../packages/web-layer-admin/README.md)

## Why a separate app

- **Security:** Admin routes and `ADMIN_TOKEN` never ship in the public Lambda bundle.
- **Local tooling:** MinIO emulates S3/CDN for all environments without touching AWS.
- **One UI, three stores:** SQLite, Postgres, and DynamoDB Local run side by side; the nav selector picks which backend to CRUD.

## Architecture

```mermaid
flowchart LR
  subgraph host["Host (127.0.0.1)"]
    Browser["Browser :4400"]
  end

  subgraph stack["tgmc-admin Compose"]
  Admin["admin\n@tgmc/admin"]
  SQLite["SQLite\n./data/admin.sqlite"]
  PG["postgres :5432"]
  DDB["dynamodb-local"]
  MinIO["minio :9000"]
  end

  Browser --> Admin
  Admin -->|db=sqlite| SQLite
  Admin -->|db=postgres| PG
  Admin -->|db=dynamodb| DDB
  Admin --> MinIO
  Admin -.->|sync read-only| Output[".output/{local,development,test}/public"]
```

| Piece   | Path                                |
| ------- | ----------------------------------- |
| App     | `core/admin` (`@tgmc/admin`)        |
| Layer   | `packages/web-layer-admin`          |
| Compose | `docker/docker-compose.admin.yml`   |
| Helper  | `scripts/docker-admin.mjs`          |
| Env     | `.env.admin.example` → `.env.admin` |

## Surfaces

| Route             | Purpose                                       |
| ----------------- | --------------------------------------------- |
| `/admin`          | Paste `ADMIN_TOKEN` (sessionStorage)          |
| `/admin/blog`     | Blog CRUD (from `@tgmc/web-layer-admin`)      |
| `/admin/messages` | List/delete contact messages                  |
| `/admin/cdn`      | List/upload/delete/sync assets in local MinIO |

## Database selection

Use the **Database** dropdown in the admin nav. Values are **database backends**, not `SYS_ENV` stack names:

| UI value   | Backend        | Data location                         |
| ---------- | -------------- | ------------------------------------- |
| `sqlite`   | SQLite         | `./data/admin.sqlite` (host volume)   |
| `postgres` | PostgreSQL 16  | `tgmc-postgres-admin` container       |
| `dynamodb` | DynamoDB Local | in-memory, `portfolio-admin-*` tables |

- Stored in `sessionStorage` (`portfolio.adminDatabase`).
- Sent on every API call as `X-Admin-Database`.
- Server may also accept `?db=sqlite|postgres|dynamodb` on admin APIs.

Internally, stores still use the existing adapters:

| Database   | Store `SYS_ENV` | CDN sync output dir          |
| ---------- | --------------- | ---------------------------- |
| `sqlite`   | `local`         | `.output/local/public`       |
| `postgres` | `development`   | `.output/development/public` |
| `dynamodb` | `test`          | `.output/test/public`        |

## Commands

```bash
cp .env.admin.example .env.admin   # set ADMIN_TOKEN
npm run docker:admin               # all DBs + MinIO + admin :4400
npm run docker:admin:down
npm run docker:build:admin         # image build only
npm run build:admin                # Nuxt build → .output/admin
```

Open `http://127.0.0.1:4400/admin` after healthchecks pass.

`docker:admin` with `--build` prepares `.output/local`, `.output/development`, `.output/test`, and `.output/admin` via `scripts/prepare-nitro-output.mjs` so CDN sync and the admin image have staged assets.

## Environment variables

Copy `.env.admin.example` to `.env.admin`. Required for writes:

| Variable                                         | Purpose                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `ADMIN_TOKEN` / `NUXT_ADMIN_TOKEN`               | Shared secret for Bearer auth                                       |
| `ADMIN_SQLITE_DATABASE_URL`                      | e.g. `file:/app/data/admin.sqlite`                                  |
| `ADMIN_POSTGRES_DATABASE_URL`                    | e.g. `postgres://portfolio:portfolio@postgres:5432/portfolio_admin` |
| `DYNAMO_TABLE` / `NUXT_DYNAMO_TABLE`             | Messages table (default `portfolio-admin-Messages`)                 |
| `DYNAMO_POSTS_TABLE` / `NUXT_DYNAMO_POSTS_TABLE` | Posts table (default `portfolio-admin-Posts`)                       |
| `AWS_REGION`                                     | DynamoDB region (default `us-west-2`)                               |
| `AWS_ENDPOINT_URL`                               | `http://dynamodb:8000` inside Compose                               |
| `DEFAULT_ADMIN_DATABASE`                         | UI default (`sqlite`)                                               |
| `ADMIN_DATABASES`                                | Comma list enabled in UI                                            |
| `S3_BUCKET`                                      | MinIO bucket (default `portfolio-assets`)                           |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`        | MinIO credentials                                                   |

Ports (host bindings, all `127.0.0.1`):

| Port   | Service                               |
| ------ | ------------------------------------- |
| `4400` | Admin UI                              |
| `4410` | MinIO S3 API                          |
| `4411` | MinIO console                         |
| `5433` | Postgres (optional host access)       |
| `8001` | DynamoDB Local (optional host access) |

## Admin API

All routes require `Authorization: Bearer <ADMIN_TOKEN>` unless noted. Include `X-Admin-Database` (or `?db=`) for data-backed routes.

| Method   | Path                          | Database-aware                                         |
| -------- | ----------------------------- | ------------------------------------------------------ |
| `GET`    | `/api/admin/posts`            | Yes                                                    |
| `POST`   | `/api/admin/posts`            | Yes                                                    |
| `GET`    | `/api/admin/posts/:id`        | Yes                                                    |
| `PUT`    | `/api/admin/posts/:id`        | Yes                                                    |
| `DELETE` | `/api/admin/posts/:id`        | Yes                                                    |
| `GET`    | `/api/admin/messages`         | Yes                                                    |
| `DELETE` | `/api/admin/messages/:id`     | Yes                                                    |
| `GET`    | `/api/admin/cdn/objects`      | No (MinIO only)                                        |
| `PUT`    | `/api/admin/cdn/objects`      | No                                                     |
| `DELETE` | `/api/admin/cdn/objects?key=` | No                                                     |
| `POST`   | `/api/admin/cdn/sync`         | Yes (picks `.output/<sysEnv>/public` from selected DB) |

Public site still exposes `POST /api/messages` (contact form). Listing/deleting messages is admin-only.

See also [API UML](../reference/api-uml.md) and [messages API](./messages-api.md).

## Local CDN (MinIO)

MinIO runs in every admin stack. After syncing public assets:

```env
NUXT_APP_CDN_URL=http://127.0.0.1:4410/portfolio-assets
```

Restart the public web/lambda service after changing `NUXT_APP_CDN_URL`. Details: cdn-guide.md.

**Sync workflow**

1. Build the public app for the target environment (`npm run build` with the right `SYS_ENV`, or let `docker:admin --build` stage outputs).
2. In admin → **CDN**, select the matching database (maps to `.output` dir above).
3. Click **Sync from .output**.

## Code walkthrough

Database selection is explicit in code — not tied to `SYS_ENV` on the admin container.

**Client** (`packages/web-layer-admin/app/utils/admin-token.ts`):

```ts
// Sends Bearer token + X-Admin-Database on every admin API call.
export const adminRequestHeaders = () => ({
  ...adminAuthHeaders(),
  ...adminDatabaseHeader(), // reads sessionStorage via readAdminDatabase()
});
```

**Server resolve** (`core/admin/server/utils/admin-database.ts`):

```ts
// Precedence: ?db= → X-Admin-Database → DEFAULT_ADMIN_DATABASE
const selected = parseAdminDatabase(fromQuery) ?? parseAdminDatabase(fromHeader) ?? defaultAdminDatabase(config);

// Maps UI id → existing store factory SYS_ENV:
// sqlite → local, postgres → development, dynamodb → test
createMessageStore(messageStoreOptionsForDatabase(config, selected));
```

**Blog plugin** (`core/admin/server/plugins/admin-blog.ts`):

```ts
// Per-request store (public app uses a singleton instead).
nitroApp.hooks.hook('request', (event) => {
  const database = resolveAdminDatabase(event, config);
  const store = createBlogPostStoreForDatabase(config, database);
  event.context.adminBlog = {/* listAllPosts, … */};
});
```

**CDN sync** maps the selected database to a staged `.output` folder:

```ts
// sqlite → .output/local/public, postgres → .output/development/public, etc.
syncPublicAssetsToMinio(config, outputSysEnvForDatabase(database));
```

## Development notes

- **Do not** add `extends: ['@tgmc/web-layer-admin']` back to `core/web/nuxt.config.ts`.
- Admin reuses `core/web` `Ui*` components and `#web-server` store factories; keep imports on the documented entry boundaries ([utilities](../../packages/utilities.md)).
- `core/admin` `npm run dev` is for layer work only — you must supply DB URLs and tokens locally; prefer `docker:admin` for integration testing.
- Tests: `cd core/admin && npm test` (Vitest for `admin-database` + MinIO helpers).

## Troubleshooting

| Symptom                           | Check                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `401` on all admin APIs           | `ADMIN_TOKEN` in `.env.admin`; token pasted at `/admin`                                          |
| Empty messages/posts after switch | Expected — each database is isolated; seed or create data per backend                            |
| CDN sync skipped / 0 files        | Build missing for that DB’s `.output/<sysEnv>/public`; run `docker:admin --build`                |
| Postgres connection errors        | `tgmc-postgres-admin` healthy; `ADMIN_POSTGRES_DATABASE_URL` uses host `postgres` inside Compose |
| DynamoDB errors                   | `dynamodb-init` completed; tables `portfolio-admin-Messages` / `portfolio-admin-Posts`           |
| Port already in use               | Change `ADMIN_PORT`, `POSTGRES_PORT`, or `DYNAMODB_PORT` in `.env.admin`                         |

## See also

- docker.md — all Compose stacks
- docker/README.md — port map + admin stack section
- [data-stores.md](../data-stores.md) — SQLite / Postgres / Dynamo adapters
- cdn-guide.md — production CDN vs local MinIO
