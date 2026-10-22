# Data stores & environment keys

## Backend selection (`DATA_BACKEND`)

`DATA_BACKEND=sqlite|postgres|dynamodb` chooses the data store. When it is unset, `SYS_ENV` picks the default (a non-blank `E2E_STORE_SYS_ENV` replaces it for this lookup, for stores and media alike); an invalid value throws. The resolver is `resolveDataBackend(env)` in the Node entry of `@tgmc/utilities`; the message store, blog post store and `getMediaLibrary` (`@tgmc/media-nuxt`) all call it, so they always agree.

| SYS_ENV                         | Default backend (`DATA_BACKEND` unset) | Required connection keys                                                                                                 |
| ------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `local`                         | `sqlite`                               | `DATABASE_URL` / `NUXT_DATABASE_URL` (`file:./data/local.sqlite`)                                                        |
| `development` (legacy `remote`) | `dynamodb`                             | `DYNAMO_TABLE`, `DYNAMO_POSTS_TABLE`, `AWS_REGION` + a DynamoDB endpoint (below); Docker supplies all of them            |
| `test`                          | `dynamodb`                             | `DYNAMO_TABLE` / `NUXT_DYNAMO_TABLE`, `DYNAMO_POSTS_TABLE` / `NUXT_DYNAMO_POSTS_TABLE`, `AWS_REGION` / `NUXT_AWS_REGION` |
| `production`                    | `dynamodb`                             | same as test                                                                                                             |

Overrides in use: `docker:local` and `docker:dev` set `DATA_BACKEND=dynamodb` against DynamoDB Local (`docker:local` has `SYS_ENV=local`); `DATA_BACKEND=sqlite` runs them on SQLite instead; `DATA_BACKEND=postgres` (with `COMPOSE_PROFILES=postgres`) brings back the old dev Postgres. `scripts/e2e-regression.mjs` pins `DATA_BACKEND=sqlite` so the CI regression job (`SYS_ENV=test`, no Docker) stays on SQLite.

| Backend    | Messages / posts             | Media (`getMediaLibrary`)                                                                                          |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `sqlite`   | SQLite file (`DATABASE_URL`) | Local SQLite + filesystem under `MEDIA_LOCAL_ROOT`                                                                 |
| `postgres` | Postgres (`DATABASE_URL`)    | Local SQLite + filesystem (a one-time warning is logged: there is no Postgres media adapter)                       |
| `dynamodb` | DynamoDB tables              | DynamoDB `MEDIA_TABLE` + S3 `ASSETS_BUCKET`; **throws** when either is missing (no silent fallback to local files) |

On `sqlite` and `postgres` the local media library mimics S3: presigned uploads go to a signed `PUT /api/media/_local-s3/<key>` and objects are served read-only at `/m/**` ([media-nuxt upload modes](../packages/media-nuxt.md#upload-modes)).

**DynamoDB endpoint.** The DynamoDB adapters (messages, posts, media) read the endpoint from, in order: the explicit `endpoint` option, `DYNAMODB_ENDPOINT`, `AWS_ENDPOINT_URL_DYNAMODB`, `AWS_ENDPOINT_URL`. Unset means real AWS. With an endpoint set they pass `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (and `AWS_SESSION_TOKEN`) as static credentials when both keys are present (DynamoDB Local accepts any value; the Docker stacks set `local`).

**Rule:** SQLite and Postgres are for local development only (host or Docker). **test** and **production** run on **DynamoDB** for MessageStore / BlogPostStore — never SQLite or Postgres on Lambda; do not set `DATA_BACKEND` there.

**Contract tests.** `core/web/tests/server/db/dynamodb.contract.spec.ts` and `packages/media-aws/tests/dynamo-local.contract.spec.ts` run the real adapters against DynamoDB Local when `DYNAMODB_TEST_ENDPOINT` is set and skip otherwise. CI's local-parity job provides it with a `services: dynamodb` container (`amazon/dynamodb-local:2.5.2` on `http://localhost:8000`); the specs stub their own dummy AWS credentials and region, so the job sets none; locally, point it at a running stack (`DYNAMODB_TEST_ENDPOINT=http://localhost:8010` for `docker:dev`/`docker:local`). The suites create and delete their own uniquely named tables. `nx.json` lists the variable as a test input so a skipped run is never replayed from the Nx cache.

### Nuxt Content (separate from MessageStore / BlogPostStore)

| SYS_ENV                 | Content database                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `local` / `development` | Default Nuxt Content SQLite (dev filesystem)                                                                                                  |
| `test` / `production`   | In-memory SQLite (`content.database.filename: ':memory:'`) restored from the build dump on cold start — no writable Content DB file on Lambda |

Content is not stored in DynamoDB; the in-memory dump is the serverless-safe path. Do not point Content at `/tmp/*.sqlite` or Postgres on test/prod.

The in-app `/docs` hub parses markdown from the repo `docs/` directory **in place** (see [gallery-and-docs.md](./features/gallery-and-docs.md)). Those files are not copied into `core/web/content/`.

Factories: `server/db/index.ts` (messages), `server/db/blog-store.ts` (posts).  
Runtime wiring: `server/api/{messages,posts}/store-options.ts`.  
Empty baked `runtimeConfig` strings are treated as unset (`nonEmpty` / `firstNonEmptyEnv`) so process env can supply real values. Prefer `NUXT_*` when both plain and Nuxt names are set.

## Keys by environment (templates)

| Key                                              | local                             | development                           | test                      | production                                       |
| ------------------------------------------------ | --------------------------------- | ------------------------------------- | ------------------------- | ------------------------------------------------ |
| `SYS_ENV`                                        | `local`                           | `development`                         | `test`                    | `production`                                     |
| `HOST`                                           | `tgmc-portfolio.local`            | `tgmc-portfolio.test`                 | `localhost` (local proxy) | unused on Lambda                                 |
| `PORT`                                           | `4200`                            | `4200`                                | `4300` (local proxy)      | unused on Lambda                                 |
| `DATA_BACKEND`                                   | unset (SQLite); Docker `dynamodb` | unset (`dynamodb`); `postgres` opt-in | unset (`dynamodb`)        | unset (`dynamodb`)                               |
| `DATABASE_URL` / `NUXT_DATABASE_URL`             | SQLite file URL                   | Postgres URL (opt-in)                 | unused                    | unused                                           |
| `DYNAMO_TABLE` / `NUXT_DYNAMO_TABLE`             | Docker (DynamoDB Local)           | required (Docker sets it)             | required                  | required                                         |
| `DYNAMO_POSTS_TABLE` / `NUXT_DYNAMO_POSTS_TABLE` | Docker (DynamoDB Local)           | required (Docker sets it)             | required                  | required                                         |
| `AWS_REGION` / `NUXT_AWS_REGION`                 | —                                 | —                                     | required (`us-west-2`)    | required                                         |
| `ADMIN_TOKEN` / `NUXT_ADMIN_TOKEN`               | Docker admin only                 | Docker admin only                     | Docker admin only         | —                                                |
| `SITE_URL` / `NUXT_PUBLIC_SITE_URL`              | yes                               | yes                                   | yes                       | HTTPS required                                   |
| `OPENAI_MODEL` / `NUXT_OPENAI_MODEL`             | yes                               | yes                                   | yes                       | yes                                              |
| `OPENAI_API_KEY` / `NUXT_OPENAI_API_KEY`         | secret if live                    | secret if live                        | secret if live            | secret if live                                   |
| `AI_LAB_*` / `NUXT_*`                            | optional                          | optional                              | optional                  | gated in CD                                      |
| `CORS_ALLOW_ORIGIN`                              | —                                 | —                                     | `*` (test)                | `https://likwidmack.com` (must match `SITE_URL`) |
| `NUXT_APP_CDN_URL`                               | optional                          | optional                              | CloudFront                | CloudFront                                       |

## Where values are injected

Local and development reads process env (`SYS_ENV`, `DATABASE_URL` / `NUXT_DATABASE_URL`). Test and production map adapter keys (`DYNAMO_TABLE`, `DYNAMO_POSTS_TABLE`, `AWS_REGION`) through Nitro `runtimeConfig`.

## Verify

```bash
npm run db:migrate:local
cd core/web && npx vitest run tests/server/db tests/resolve-process-env.spec.ts
npm run docker:dev    # DynamoDB Local + MinIO (COMPOSE_PROFILES=postgres DATA_BACKEND=postgres for Postgres)
npm run docker:test   # Dynamo Local in memory (ensureNitroOutput first)
```
