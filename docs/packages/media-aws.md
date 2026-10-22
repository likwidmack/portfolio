# `@tgmc/media-aws`

AWS adapters and SQS worker for [`@tgmc/media`](./media.md).

Package README: [`packages/media-aws/README.md`](../../packages/media-aws/README.md).

## Role

| Concern                                   | Owner                                                    |
| ----------------------------------------- | -------------------------------------------------------- |
| DynamoDB catalog / jobs / audit           | This package                                             |
| S3 blobs under `m/` on AssetsBucket       | This package                                             |
| Presigned PUT ingest (reserved key)       | `createPresignedIngest`, `PRESIGN_REQUIRED_HEADERS`      |
| SQS enqueue + worker `runMaterializeJob`  | This package                                             |
| CloudFront invalidation on delete/replace | `invalidateMediaPaths` / MediaLibrary hooks              |
| HTTP routes                               | `@tgmc/media-nuxt` `/api/media/*` (Bearer `ADMIN_TOKEN`) |
| IaC                                       | `infra/sam` Media table, queue, worker, Nitro IAM        |

Requirements: [`docs/plans/2026-09-22-002-feat-media-aws-backend-plan.md`](../plans/2026-09-22-002-feat-media-aws-backend-plan.md).

## HTTP API (Bearer admin)

| Method | Path                                | Notes                                                                                                                                                                                            |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/api/media/ingest/presign`         | `{ kind, mime, filename, tenant? }` → reserves `m/{tenant}/{kind}/{name}.{ext}`, returns `{ assetId, path, name, expiresAt, uploadUrl, headers }`; **409** `name_conflict` with a suggested name |
| POST   | `/api/media/ingest/complete`        | `{ assetId, path, kind, mime, filename?, meta?, sha256? }`; `path` must be the key reserved for `assetId` (400 otherwise)                                                                        |
| GET    | `/api/media/assets`                 | list (`kind`, `tenant`, `tag`, `limit`, `offset`)                                                                                                                                                |
| GET    | `/api/media/assets/:id`             | asset + children                                                                                                                                                                                 |
| POST   | `/api/media/assets/:id/materialize` | `{ role?, variant?, format?, recipe?, useDefaultThumb? }` → enqueue (or sync locally); default is the `t` thumbnail                                                                              |
| GET    | `/api/media/jobs/:id`               | job status                                                                                                                                                                                       |
| DELETE | `/api/media/assets/:id`             | hard cascade + invalidation when configured                                                                                                                                                      |

## Keys and DynamoDB layout

Object keys are the catalog `path` (`m/{tenant}/{kind}/{name}.{ext}`, variants `…@{variant}.{ext}`); `toS3Key` is the identity for `m/` keys and `toCloudFrontPath` is `/` + key. See [media](./media.md#keys-names-and-variants) for the scheme.

| Item               | Key                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Asset              | `pk = ASSET#{id}`, `sk = META`; `gsi1pk = T#pf#K#i` (tenant + kind code), `gsi2pk = T#pf#ALL`      |
| Child              | `pk = ASSET#{id}`, `sk = CHILD#{childId}` (+ `CHILDLOOKUP#{childId}`)                              |
| Name / reservation | `pk = NAME#m/{tenant}/{kind}/{name}`, `sk = META` → `{ assetId, path, pending, expiresAt?, ttl? }` |

The `NAME#` key has no extension, so `hero.png` and `hero.jpg` share one item and the second is a 409 `name_conflict` with a `-2` suggestion (the suggestion search reads `NAME#` items, up to 1000 consistent reads in the worst case). `insertAsset` writes the asset and its `NAME#` item in one transaction (`attribute_not_exists` on both; the name item may also be the asset's own pending reservation or another asset's expired one). A pending reservation carries `expiresAt` and a numeric epoch-seconds `ttl`; the completed claim is permanent (`pending = false`) and carries neither.

**DynamoDB TTL.** Enable TTL on attribute `ttl` for the media table so lapsed reservations are deleted (`infra/sam/template.yaml` sets `TimeToLiveSpecification: { AttributeName: ttl, Enabled: true }` on `MediaTable`; `docker/dynamodb-init.sh` enables it on the `docker:test` Media table too). TTL deletion is lazy (up to ~48 h), so reads still compare `expiresAt` and treat an expired reservation as free. `deleteAsset` removes both in one transaction, so a deleted name is reusable at once. `listAssets` queries the tenant-scoped GSI partitions.

## Presign and S3 headers

`createPresignedIngest({ path, assetId, mime, bucket })` signs a PUT for an already reserved key. `PRESIGN_REQUIRED_HEADERS` (`Content-Type`, `If-None-Match`, `Cache-Control`, `Content-Disposition`) is the single list of headers the uploader must send, each with exactly the value returned in `headers` (they are signed into the URL); the bucket CORS `AllowedHeaders` must cover it, which `scripts/sam-template.test.js` checks by importing `packages/media-aws/src/presign-headers.ts` directly (Node type stripping, no build step; the file has no imports on purpose).

`S3BlobStore.put` sets `ContentType`, `CacheControl` and `ContentDisposition` when given (server-side writes: ingest and variants). Presigned uploads carry the same headers (`Cache-Control: public, max-age=31536000, immutable`, `Content-Disposition: inline; filename="<name>.<ext>"`, the asset mime), so browser and admin remote-forward uploads match server-side writes.

Variant replacement and delete call `invalidateMediaPaths` (`/m/…` paths) when `ASSETS_DISTRIBUTION_ID` is set. IAM for the worker and Nitro grants `m/*` (and `s3:ListBucket` on prefix `m/*`, `m/`) in `infra/sam/template.yaml`.

## Endpoint overrides (DynamoDB Local + MinIO)

`S3BlobStoreOptions`, `DynamoMediaStoresOptions` (`endpoint`), the presigner and `createAwsMediaLibrary` (`dynamoEndpoint`, `s3Endpoint`, `s3ForcePathStyle`) accept custom endpoints; `forcePathStyle` is needed for MinIO. `createPresignedIngest` also takes `publicEndpoint`: the URL is signed against the host the uploader can reach (`http://localhost:4420` in `docker:test`), not the server's own `http://minio:9000`. `mediaAwsEndpointsFromEnv()` maps `AWS_ENDPOINT_URL_DYNAMODB`, `MEDIA_S3_ENDPOINT` / `AWS_ENDPOINT_URL_S3`, `MEDIA_S3_FORCE_PATH_STYLE=1` and `MEDIA_S3_PUBLIC_ENDPOINT`; the SQS worker uses it too. See [media-nuxt](./media-nuxt.md#env) and docker. `scripts/media-smoke.js` (`npm run docker:test:smoke`, CD with `MEDIA_SMOKE_ENABLED=1`) exercises presign → PUT → complete → materialize → delete end to end.

## Transfer (seed and backup)

`transferMedia` from `@tgmc/media` works on these adapters. `createDynamoMediaStores` plus `S3BlobStore` form one `MediaEndpoint`, and `S3BlobStore.digestSha256` re-hashes each copied object. `insertAsset` writes the `NAME#` claim in the same transaction as the asset, and objects get the immutable cache and inline disposition headers. `npm run media:transfer` (`scripts/media-transfer.js`) wires `aws:<table>@<bucket>` endpoints with the same `--dynamodb-endpoint` / `--s3-endpoint` / `--path-style` overrides. See [media § Transfer between backends](./media.md#transfer-between-backends) and the production runbook.

## Env (Lambda)

`MEDIA_TABLE` / `NUXT_MEDIA_TABLE`, `ASSETS_BUCKET`, `MEDIA_QUEUE_URL`, `ASSETS_DISTRIBUTION_ID`, `ADMIN_TOKEN`, `NUXT_AWS_REGION`.

When the data backend is not `dynamodb` (host `npm run dev`, or `DATA_BACKEND=sqlite|postgres`), media uses SQLite/FS under `MEDIA_LOCAL_ROOT` (default `.data/media`; sync materialize) even if the table and bucket are set, and presign / complete switch to local presign mode (a signed PUT to `/api/media/_local-s3/<key>` into `FsBlobStore`, same headers and checks; see [media-nuxt](./media-nuxt.md#upload-modes)).
