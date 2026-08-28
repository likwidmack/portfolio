# Data stores & environment keys

## SYS_ENV → adapter

| SYS_ENV       | App adapters (messages / blog posts) | Required connection keys                                                                                                 |
| ------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `local`       | SQLite                               | `DATABASE_URL` / `NUXT_DATABASE_URL` (`file:./data/local.sqlite`)                                                        |
| `development` | PostgreSQL                           | `DATABASE_URL` / `NUXT_DATABASE_URL` (Postgres URL)                                                                      |
| `test`        | DynamoDB                             | `DYNAMO_TABLE` / `NUXT_DYNAMO_TABLE`, `DYNAMO_POSTS_TABLE` / `NUXT_DYNAMO_POSTS_TABLE`, `AWS_REGION` / `NUXT_AWS_REGION` |
| `production`  | DynamoDB                             | same as test                                                                                                             |

**Rule:** SQLite and Postgres are for **local / development** only. **test** and **production** use **DynamoDB** for MessageStore / BlogPostStore — never SQLite or Postgres on Lambda.

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

| Key                                              | local                  | development           | test                      | production                                       |
| ------------------------------------------------ | ---------------------- | --------------------- | ------------------------- | ------------------------------------------------ |
| `SYS_ENV`                                        | `local`                | `development`         | `test`                    | `production`                                     |
| `HOST`                                           | `tgmc-portfolio.local` | `tgmc-portfolio.test` | `localhost` (local proxy) | unused on Lambda                                 |
| `PORT`                                           | `4200`                 | `4200`                | `4300` (local proxy)      | unused on Lambda                                 |
| `DATABASE_URL` / `NUXT_DATABASE_URL`             | SQLite file URL        | Postgres URL          | unused                    | unused                                           |
| `DYNAMO_TABLE` / `NUXT_DYNAMO_TABLE`             | —                      | —                     | required                  | required                                         |
| `DYNAMO_POSTS_TABLE` / `NUXT_DYNAMO_POSTS_TABLE` | —                      | —                     | required                  | required                                         |
| `AWS_REGION` / `NUXT_AWS_REGION`                 | —                      | —                     | required (`us-west-2`)    | required                                         |
| `ADMIN_TOKEN` / `NUXT_ADMIN_TOKEN`               | Docker admin only      | Docker admin only     | Docker admin only         | —                                                |
| `SITE_URL` / `NUXT_PUBLIC_SITE_URL`              | yes                    | yes                   | yes                       | HTTPS required                                   |
| `OPENAI_MODEL` / `NUXT_OPENAI_MODEL`             | yes                    | yes                   | yes                       | yes                                              |
| `OPENAI_API_KEY` / `NUXT_OPENAI_API_KEY`         | secret if live         | secret if live        | secret if live            | secret if live                                   |
| `AI_LAB_*` / `NUXT_*`                            | optional               | optional              | optional                  | gated in CD                                      |
| `CORS_ALLOW_ORIGIN`                              | —                      | —                     | `*` (test)                | `https://likwidmack.com` (must match `SITE_URL`) |
| `NUXT_APP_CDN_URL`                               | optional               | optional              | CloudFront                | CloudFront                                       |

## Where values are injected

Local and development reads process env (`SYS_ENV`, `DATABASE_URL` / `NUXT_DATABASE_URL`). Test and production map adapter keys (`DYNAMO_TABLE`, `DYNAMO_POSTS_TABLE`, `AWS_REGION`) through Nitro `runtimeConfig`.

## Verify

```bash
npm run db:migrate:local
cd core/web && npx vitest run server/db tests/resolve-process-env.spec.ts
```
