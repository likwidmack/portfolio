# `@tgmc/media-aws`

AWS adapters and SQS worker for [`@tgmc/media`](./media.md).

Package README: `packages/media-aws/README.md`.

## Role

| Concern                                  | Owner                                                    |
| ---------------------------------------- | -------------------------------------------------------- |
| DynamoDB catalog / jobs / audit          | This package                                             |
| S3 blobs under `media/` on AssetsBucket  | This package                                             |
| Presigned PUT ingest                     | `createPresignedIngest`                                  |
| SQS enqueue + worker `runMaterializeJob` | This package                                             |
| CloudFront invalidation on delete        | `invalidateMediaPaths` / MediaLibrary hook               |
| HTTP routes                              | `@tgmc/media-nuxt` `/api/media/*` (Bearer `ADMIN_TOKEN`) |
| IaC                                      | `infra/sam` Media table, queue, worker, Nitro IAM        |

Requirements: [`docs/plans/2026-09-22-002-feat-media-aws-backend-plan.md`](../plans/2026-09-22-002-feat-media-aws-backend-plan.md).

## HTTP API (Bearer admin)

| Method | Path                                | Notes                                                                |
| ------ | ----------------------------------- | -------------------------------------------------------------------- |
| POST   | `/api/media/ingest/presign`         | `{ kind, mime }` → upload URL                                        |
| POST   | `/api/media/ingest/complete`        | `{ assetId, blobKey, kind, mime, filename?, meta?, sha256? }`        |
| GET    | `/api/media/assets`                 | list                                                                 |
| GET    | `/api/media/assets/:id`             | asset + children                                                     |
| POST   | `/api/media/assets/:id/materialize` | `{ role, recipe? }` or `useDefaultThumb` → enqueue (or sync locally) |
| GET    | `/api/media/jobs/:id`               | job status                                                           |
| DELETE | `/api/media/assets/:id`             | hard cascade + invalidation when configured                          |

## Env (Lambda)

`MEDIA_TABLE` / `NUXT_MEDIA_TABLE`, `ASSETS_BUCKET`, `MEDIA_QUEUE_URL`, `ASSETS_DISTRIBUTION_ID`, `ADMIN_TOKEN`, `NUXT_AWS_REGION`.

Local without those vars uses SQLite/FS under `.data/media` (sync materialize).
