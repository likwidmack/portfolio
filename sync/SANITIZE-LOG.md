# Sanitization log

What the sync publishes beyond the earlier keep-list, what was checked, and what still needs a
look before the first sync that publishes it. Update this file whenever `allowlist.txt` grows.

## 2026-10-21: all workspace packages (`fix/buildable-mirror`)

**Why:** `core/web` depends on `@tgmc/image` and `@tgmc/media-nuxt` (which pulls in `@tgmc/media`
and `@tgmc/media-aws`). The keep-list dropped them, so `npm ci` failed in `postinstall`
(`nuxt prepare`: "The module @tgmc/media-nuxt could not be loaded"). `allowlist.txt` now keeps all
of `packages/`.

**Source checked:** `tamaramack/portfolio` `main` at `f9d37ba` (2026-10-18), exported with
`git archive` (tracked files only, so no `dist/`, `out-tsc/` or `.env*`).

**Result:** `sync.sh` + `scan.mjs` passed; `npm ci`, `npm run build:libs`, `npm run build` and
`node --test tests/*.test.mjs` passed on the sanitized output.

### Newly published packages

| Package           | Files | Findings                                                                  | Verdict |
| ----------------- | ----- | ------------------------------------------------------------------------- | ------- |
| `image`           | 37    | None                                                                      | Safe    |
| `media`           | 50    | Fixed test UUIDs only                                                     | Safe    |
| `media-aws`       | 35    | AWS wiring (S3 presign, DynamoDB, SQS); owner marked it sensitive         | **Never publish**: stand-in only |
| `media-client`    | 9     | None                                                                      | Safe    |
| `media-nuxt`      | 29    | Placeholder CDN hosts in tests (`d123` / `d9own.cloudfront.net`, `example.com`), `sqs…amazonaws.com/1/media`, MinIO bucket `portfolio-assets` | Safe    |
| `nuxt-layer-base` | 8     | None                                                                      | Safe    |

Repository, homepage and bug URLs in every package `package.json` are rewritten to
`likwidmack/portfolio`; no `tamaramack` reference is left under `packages/`.

### Checked patterns

`tamaramack`, personal email, 12-digit AWS account IDs, `arn:aws`, real `AKIA…` keys, private
keys, `password=` / `secret=`, `execute-api`, `cloudfront.net`, `amazonaws.com`, `s3://`,
private IPs, `.internal` hosts. Every hit was a test fixture, placeholder or local emulator value.

`portfolio-assets` is the local MinIO bucket from `docker/compose.aws-emulators.yml`, not a
production bucket.

### Still to check before publishing

- [ ] **Packages that only exist on `development`** (`media-postgres`, `nuxt-layer-ui`) and the
      `core/admin` app are not on source `main` yet. When they land on `main`, the keep-list
      publishes them automatically. Audit them before that sync. `core/admin` stays unpublished
      until it is added to `allowlist.txt`.

## 2026-10-21: no CD workflows on the mirror (`chore/remove-cd-workflows`)

The mirror runs read-only CI only: `test.yml` and `codeql.yml` (guarded by `tests/sync.test.mjs`).
Removed: `sync.yml` (scheduled clone, push and PR), `open-cr-pr.yml`, `github-profile.yml`,
`github-security.yml` and `.github/scripts/` (Cursor review for `sync.yml`).

Syncing is manual and runs on the owner's machine:

```bash
bash sync/sync.sh --tag main
```

Review the diff against this log, then commit on a `sync/*` branch and open the PR by hand.
The profile and security scripts in `sync/` also run locally only.

Repository secrets no longer used by any workflow: `TM_GH_TOKEN`, `LK_GH_TOKEN`, `CURSOR_API_KEY`.

## 2026-10-21: `media-aws` public stand-in

`sync/stand-in.mjs` swaps the staged `packages/media-aws` for `sync/stand-ins/media-aws/` (dest-owned),
then `sync.sh` runs `--verify` after the rewrite and stops unless the staged package is exactly the
stand-in. The stand-in keeps only the source package's name, version, entry points and
dependencies (so `package-lock.json` stays valid). It exports what `@tgmc/media-nuxt` imports:

- Kept real: `PRESIGN_REQUIRED_HEADERS`, `PRESIGN_CACHE_CONTROL` and `presignContentDisposition`
  (standard HTTP header names and values; local presign mode signs them).
- `mediaAwsEndpointsFromEnv` returns `{}` and reads no env vars.
- `createAwsMediaLibrary`, `createPresignedIngest`, `S3BlobStore` and `enqueueMaterializeJob` throw
  `MediaAwsUnavailableError`.

Not exported at all: DynamoDB stores, key schema, SQS worker, CloudFront invalidation, S3 client.

**Checked** against source `main` `f9d37ba`: sync, `npm ci`, `npm run build:libs` and `npm run build`
passed. The built server has none of `DynamoCatalogStore`, `createDynamoMediaStores`,
`mediaWorkerHandler` or `invalidateMediaPaths`. `/`, `/work`, `/about` and `/gallery` return 200.
`/api/media/assets` returns 401 "Admin writes are disabled (ADMIN_TOKEN not configured)".

**Dropped tests:** five `@tgmc/media-nuxt` specs exercise the real `media-aws` and fail against
the stand-in, so the sync removes them (`STAND_IN_DROPPED_TESTS` in `sync/stand-in.mjs`; `--verify`
fails if one is staged): `asset-urls-routes`, `ingest-routes-backend`, `media-library-env`,
`media-library` and `media-public-url` (`.spec.ts`). The other four specs pass against the stand-in
(84 tests).

**Docs kept (owner decision):** `docs/packages/media-aws.md` and the
`docs/plans/2026-09-22-*-media-*` plans stay public. They describe the package but hold no
secrets, account IDs or real hostnames.
