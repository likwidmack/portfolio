# `@tgmc/media-nuxt`

Nuxt module that mounts `/api/media/*` (plus the local `/m/**` CDN stand-in) and owns MediaLibrary resolution (local SQLite/FS or AWS).

Package README: [`packages/media-nuxt/README.md`](../../packages/media-nuxt/README.md).

## Usage

```ts
// core/web/nuxt.config.ts
modules: [, /* … */ '@tgmc/media-nuxt'];
```

Handlers live under `packages/media-nuxt/runtime/server/` (`api/` and `routes/`, registered through `addServerScanDir`). Re-exported utils: `@tgmc/media-nuxt/runtime/server/utils/media-library`, `…/media-local-s3`, `…/media-public-url`, `…/media-cdn` (`createLocalMediaCdnHandler`, which `core/admin` mounts on its own `/m/**`).

Admin `/api/admin/media/*` is **not** part of this module.

## Routes

| Route                                    | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/media/ingest/presign`         | `{ kind, mime, filename, tenant? }`: normalizes the filename, reserves the key (30 min), returns a presigned PUT. Taken name (any extension) → 409 with `data: { code: 'name_conflict', path, suggestedName, suggestedFilename, suggestedPath }`; extension that disagrees with the mime → 400 with the corrected filename. Errors are mapped by `mediaErrorToHttp` from `@tgmc/media`                                |
| `POST /api/media/ingest/complete`        | `{ assetId, path, kind, mime, … }`: `path` must be the key reserved for `assetId`; a missing/expired reservation is 400, a lost race is 409. An image then gets its `t` thumbnail (see [Automatic thumbnail](#automatic-thumbnail)); the response is the asset with `publicUrl` / `previewUrl`                                                                                                                        |
| `POST /api/media/assets/:id/materialize` | `{ role?, variant?, format?, recipe?, useDefaultThumb? }`. `variant` (`t`/`640`/`1280`/`1920`) is a catalog variant at a stable key; `recipe` is a custom child; neither → `t`. `p` → 400. Re-materializing a catalog (variant, format) replaces the object in place and invalidates the CDN; the existing child stays `ready` (with its old meta) while the replacement job runs, and keeps serving if the job fails |
| `GET /api/media/assets`                  | `kind`, `tenant`, `tag`, `limit`, `offset`. Each asset carries `publicUrl` and `previewUrl` (see [Asset URLs](#asset-urls))                                                                                                                                                                                                                                                                                           |
| `GET /api/media/assets/:id`              | `{ asset, children }`; `asset` carries `publicUrl` and `previewUrl`                                                                                                                                                                                                                                                                                                                                                   |
| `PUT /api/media/_local-s3/<key>`         | Filesystem backends only (404 on `dynamodb` and on Lambda). The local presigned PUT: no Bearer, the `expires` + `sig` query is the credential. See [local presign mode](#local-presign-mode)                                                                                                                                                                                                                          |
| `GET`/`HEAD /m/<tenant>/<kind>/<file>`   | Filesystem backends only (404 on `dynamodb` and on Lambda). Public, read-only CDN stand-in. See [CDN stand-in](#cdn-stand-in-m)                                                                                                                                                                                                                                                                                       |

### Upload modes

`resolveMediaIngestMode()` picks the mode of `presign` and `complete` from the resolved data backend (same resolution as `getMediaLibrary`, including `E2E_STORE_SYS_ENV`), so the catalog and the blobs always sit in the same place. Docker stacks set `MEDIA_TABLE` + `ASSETS_BUCKET` even with `DATA_BACKEND=sqlite|postgres`; the backend, not those variables, decides.

| Backend               | Mode    | `presign` returns                                            | `complete` reads the object from        |
| --------------------- | ------- | ------------------------------------------------------------ | --------------------------------------- |
| `dynamodb`            | `aws`   | S3/MinIO presigned PUT (`createPresignedIngest`)             | `S3BlobStore` (head + streamed SHA-256) |
| `sqlite` / `postgres` | `local` | `PUT /api/media/_local-s3/<key>?expires=&sig=` (this origin) | `FsBlobStore` (head + re-read SHA-256)  |

`dynamodb` without `MEDIA_TABLE` + `ASSETS_BUCKET` is a **503**. On Lambda (`AWS_LAMBDA_FUNCTION_NAME` set) local mode is always off, whatever backend resolves (`isLocalMediaBackend()` is false): media is DynamoDB + S3 there, like the library `getMediaLibrary()` opens, so `presign` / `complete` use `aws` mode (503 naming Lambda without the table and bucket), and the `_local-s3` PUT and `/m/**` routes are 404. Everything else is identical in both modes: the name reservation and its 409 with a suggested name, the response shape, the four headers the PUT must send, create-only originals (412 on a second PUT), and the reservation + SHA-256 checks in `complete` (a missing object is 404). Async (queued) `materialize` stays AWS-only: with `MEDIA_QUEUE_URL` set, `assertMediaAwsMode()` returns **503** naming the resolved backend unless media is on AWS (`dynamodb`, or any backend on Lambda) with the table and bucket; without a queue, materialize runs synchronously against the active library in both modes.

### Local presign mode

`createLocalPresignedIngest` (`runtime/server/utils/media-local-s3.ts`) signs an absolute URL on the request origin (`X-Forwarded-Host` / `X-Forwarded-Proto` honoured), valid 15 minutes like the S3 presign. The signature is HMAC-SHA256, keyed with `MEDIA_LOCAL_SIGNING_SECRET` (a random per-process secret when unset, so URLs die on restart), over the method, the key, `expires`, the upload byte cap and the values of the four `PRESIGN_REQUIRED_HEADERS`. The PUT route checks, in order:

1. the key is a media original (`@variant` keys, traversal and anything `parseMediaKey` rejects → 400);
2. the signature, compared in constant time (a different key, Content-Type, `Cache-Control`, `Content-Disposition` or a missing `If-None-Match: *` → 403 `SignatureDoesNotMatch`, as on S3);
3. the expiry (403);
4. a declared `Content-Length` over `MEDIA_LOCAL_UPLOAD_MAX_BYTES` (413);

then streams the body into `FsBlobStore.putStream` with the same cap (413 mid-stream; a chunked upload may see the connection close instead) as a create-only write (412 if the original exists), and answers 200 with the object's `ETag`. The headers land in the sidecar, so the object is served exactly like a presigned S3 object.

### CDN stand-in (`/m/**`)

On the filesystem backends `GET`/`HEAD /m/<tenant>/<kind>/<file>` serves `FsBlobStore` objects at the path CloudFront serves on AWS. Responses carry the sidecar `Content-Type`, `Cache-Control: no-cache`, `Content-Disposition: inline; filename="…"` (defaults for blobs without a sidecar), `X-Content-Type-Options: nosniff`, the `ETag`, `Accept-Ranges: bytes` and `Content-Length`. `If-None-Match` is a weak comparison over a list or `*` (`W/"x"` matches `"x"`; 304). A single `GET` byte range (`bytes=a-b`, `a-`, `-n`) gets a **206** with `Content-Range` (clamped to the object; **416** with `bytes */size` when unsatisfiable); several ranges, another unit or a malformed header serve the whole object, and `If-Range` allows the range only for the current ETag (strong comparison). Safari plays `<video>` only with 206 responses. Headers and body come from one opened file, so a variant overwritten mid-request never mixes generations. Unlike CloudFront's one-year `immutable`, browsers revalidate every time (a cheap 304): local URLs are reused (variants are overwritten in place, a deleted original can be uploaded again under its key) and nothing invalidates them. The sidecar still records the S3 `Cache-Control`. Only valid media keys resolve, so sidecars (`*.meta.json`), temp files and paths outside the blob root are 404; other methods are 405. Because it serves on the app origin, every response that is not passive media gets `Content-Security-Policy: default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox`, so an SVG, HTML, XHTML, XML or unknown-type object opened directly runs no script. The check uses the MIME essence (parameters stripped, trimmed, lowercased, so `Image/SVG+XML; charset=utf-8` is SVG). Passive types are left alone: `image/*` except SVG, `audio/*`, `video/*`, `model/*`, `font/*` and `application/pdf` (Chrome will not render a PDF in a sandbox). This is a dev-only hardening; CloudFront serves media from its own origin and does not add it. On `dynamodb` the route is 404: CloudFront (AWS) or MinIO (Docker) serve `m/*` there.

The handler is `createLocalMediaCdnHandler({ enabled, store })` (`…/media-cdn`); this module mounts it with `isLocalMediaBackend()` and the library's `FsBlobStore`, and `core/admin` mounts it on its own local library ([admin.md](../web/features/admin.md#local-media-library-dam)).

`core/web/server/middleware/cdn.ts` (the static-asset 302 to the CDN) leaves `/m/…` alone while local media is on, so the stand-in answers even when `NUXT_APP_CDN_URL` is set; otherwise it sends `/m/…` to `mediaPublicBaseUrl()`, not to the static-asset CDN, also when `NUXT_APP_CDN_URL` is unset (e.g. MinIO on Docker `dynamodb`); the static-asset CDN is the fallback only when no media base is known. Every `/m/` object is redirected whatever its extension (documents included); outside `/m/` the static extension list decides.

### Public URLs

`mediaPublicBaseUrl()` (`runtime/server/utils/media-public-url.ts`) is where media is publicly readable; every media URL is that base + `/` + key (`mediaPublicUrl(key)`), e.g. `/m/pf/i/manhattan-keyframe@t.webp` on host dev. The first match wins:

| When                                    | Base                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| `MEDIA_PUBLIC_BASE_URL` set             | That value, on every backend (SAM: the stack's own CloudFront distribution)     |
| `sqlite` / `postgres` (never on Lambda) | `''` (same origin, served by `/m/**`), whatever CDN variables are set           |
| `dynamodb`, or anything on Lambda       | `NUXT_APP_CDN_URL`, else `NUXT_PUBLIC_CDN_URL`                                  |
| `dynamodb` without a CDN                | `MEDIA_S3_PUBLIC_ENDPOINT` + `/` + `ASSETS_BUCKET` (MinIO in Docker), else `''` |

Trailing slashes are dropped. On the SAM `test` stack `NUXT_APP_CDN_URL` is the shared test CDN, which does not front the stack's `AssetsBucket`, so the template sets `MEDIA_PUBLIC_BASE_URL: https://${AssetsDistribution.DomainName}` on test and production (`scripts/sam-template.test.js` pins it). On Lambda (`AWS_LAMBDA_FUNCTION_NAME` set) `getMediaLibrary()` is always DynamoDB + S3: a resolved `sqlite` / `postgres` backend without `MEDIA_TABLE` + `ASSETS_BUCKET` throws instead of writing to the Lambda filesystem.

### Asset URLs

`withMediaAssetUrls(asset, children)` / `withMediaAssetUrlsList(library, assets)` (`runtime/server/utils/media-asset-urls.ts`) add two fields to the list, detail and `complete` responses:

- `publicUrl`: the original (`mediaPublicUrl(asset.path)`).
- `previewUrl`: what a grid tile shows, from `mediaPreviewKey()` in `@tgmc/media`. Image and SVG: the ready `t` child (webp preferred), else the original. Audio and video: the original (players load it with `preload="metadata"`). Model and document: `null`.

The list reads children only for image and SVG rows (one `listChildren` each; a failure falls back to the original).

### Automatic thumbnail

After `complete` registers an image, `ensureDefaultThumbnail(library, asset)` makes the catalog `t` variant (320 w webp) unless a `t` child exists that has not failed. It goes through `materializeOrEnqueue()` (also behind `POST …/materialize`): synchronous without `MEDIA_QUEUE_URL`, queued with it (AWS only). A thumbnail failure — a rejection, or a terminal failure the library returns as a `failed` job — is logged (`[media] default thumbnail for <path> failed: <reason>`) and never fails the upload. Other kinds get no automatic variant. `core/admin`'s local upload calls the same helper.

## Env

| Variable                                                 | Role                                                                                                                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_TOKEN` / `NUXT_ADMIN_TOKEN`                       | Bearer required on the admin `/api/media/*` routes; not on the presigned `PUT /api/media/_local-s3/<key>`, whose `expires` + `sig` query is the credential                                    |
| `DATA_BACKEND`                                           | `dynamodb` → AWS adapters (needs `MEDIA_TABLE` + `ASSETS_BUCKET`, else throws); `sqlite` / `postgres` → local SQLite/FS. Unset: `SYS_ENV` default                                             |
| `MEDIA_LOCAL_ROOT`                                       | Local SQLite/FS root when the backend is not `dynamodb` (default `.data/media`; `docker:local` / `docker:dev` set `/app/data/media`): `media.sqlite` plus the `blobs/` tree served at `/m/**` |
| `MEDIA_LOCAL_SIGNING_SECRET`                             | HMAC key for local presigned PUTs; unset → random per process (URLs stop working after a restart). Set it when several processes serve one origin, or to keep URLs valid across restarts      |
| `MEDIA_LOCAL_UPLOAD_MAX_BYTES`                           | Byte cap of a local presigned PUT (default 104857600, 100 MiB)                                                                                                                                |
| `MEDIA_PUBLIC_BASE_URL`                                  | Media public base on every backend, checked first by `mediaPublicBaseUrl()`. SAM sets it to the stack's own CloudFront distribution                                                           |
| `NUXT_APP_CDN_URL` / `NUXT_PUBLIC_CDN_URL`               | Media public base on `dynamodb` when `MEDIA_PUBLIC_BASE_URL` is unset; ignored on the filesystem backends                                                                                     |
| `MEDIA_TABLE` / `NUXT_MEDIA_TABLE`                       | DynamoDB table → use `@tgmc/media-aws`                                                                                                                                                        |
| `ASSETS_BUCKET` / `NUXT_ASSETS_BUCKET`                   | S3 assets bucket (required with `MEDIA_TABLE`)                                                                                                                                                |
| `MEDIA_QUEUE_URL` / `NUXT_MEDIA_QUEUE_URL`               | Optional SQS queue for async materialize                                                                                                                                                      |
| `ASSETS_DISTRIBUTION_ID` / `NUXT_ASSETS_DISTRIBUTION_ID` | Optional CloudFront invalidation on delete                                                                                                                                                    |
| `NUXT_AWS_REGION` / `AWS_REGION`                         | AWS region for adapters                                                                                                                                                                       |
| `AWS_ENDPOINT_URL_DYNAMODB`                              | DynamoDB endpoint override (DynamoDB Local); unset on AWS                                                                                                                                     |
| `MEDIA_S3_ENDPOINT` / `AWS_ENDPOINT_URL_S3`              | S3 API endpoint the server uses (MinIO, `http://minio:9000`)                                                                                                                                  |
| `MEDIA_S3_FORCE_PATH_STYLE`                              | `1` → path-style S3 addressing (MinIO needs it)                                                                                                                                               |
| `MEDIA_S3_PUBLIC_ENDPOINT`                               | Host presigned URLs are signed for (`http://localhost:4420`); with `ASSETS_BUCKET`, the media public base in Docker when no CDN URL is set                                                    |

The endpoint variables exist for the `docker:test` stack (DynamoDB Local + MinIO) and are read by `mediaAwsEndpointsFromEnv()` in `@tgmc/media-aws`, so the web routes and the SQS worker resolve them identically. The global `AWS_ENDPOINT_URL` is ignored on purpose (in docker:test it names DynamoDB Local). `mediaS3Options()` / `mediaPresignOptions()` in `runtime/server/utils/media-library.ts` feed `S3BlobStore` (complete route) and `createPresignedIngest` (presign route).

Requirements: [`docs/plans/2026-09-22-004-feat-media-host-adapters-plan.md`](../plans/2026-09-22-004-feat-media-host-adapters-plan.md).
