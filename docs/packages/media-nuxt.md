# `@tgmc/media-nuxt`

Nuxt module that mounts `/api/media/*` and owns MediaLibrary resolution (local SQLite/FS or AWS).

Package README: `packages/media-nuxt/README.md`.

## Usage

```ts
// core/web/nuxt.config.ts
modules: [, /* … */ '@tgmc/media-nuxt'];
```

Handlers live under `packages/media-nuxt/runtime/server/`. Re-export util: `@tgmc/media-nuxt/runtime/server/utils/media-library`.

Admin `/api/admin/media/*` is **not** part of this module.

## Env

| Variable                                                 | Role                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| `ADMIN_TOKEN` / `NUXT_ADMIN_TOKEN`                       | Bearer required on all `/api/media/*` routes                     |
| `MEDIA_LOCAL_ROOT`                                       | Local SQLite/FS root when AWS vars unset (default `.data/media`) |
| `MEDIA_TABLE` / `NUXT_MEDIA_TABLE`                       | DynamoDB table → use `@tgmc/media-aws`                           |
| `ASSETS_BUCKET` / `NUXT_ASSETS_BUCKET`                   | S3 assets bucket (required with `MEDIA_TABLE`)                   |
| `MEDIA_QUEUE_URL` / `NUXT_MEDIA_QUEUE_URL`               | Optional SQS queue for async materialize                         |
| `ASSETS_DISTRIBUTION_ID` / `NUXT_ASSETS_DISTRIBUTION_ID` | Optional CloudFront invalidation on delete                       |
| `NUXT_AWS_REGION` / `AWS_REGION`                         | AWS region for adapters                                          |

Requirements: [`docs/plans/2026-09-22-004-feat-media-host-adapters-plan.md`](../plans/2026-09-22-004-feat-media-host-adapters-plan.md).
