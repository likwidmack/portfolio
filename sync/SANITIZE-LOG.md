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
| `media-aws`       | 35    | Test credentials `AKIATEST` / `secret`; `localhost` emulator ports        | Safe    |
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

- [ ] **Owner sign-off** that `media-aws` (S3 presign, DynamoDB, SQS wiring) may be public. It
      contains no secrets, but it does describe the AWS architecture.
- [ ] **Packages that only exist on `development`** (`media-postgres`, `nuxt-layer-ui`) and the
      `core/admin` app are not on source `main` yet. When they land on `main`, the keep-list
      publishes them automatically. Audit them before that sync. `core/admin` stays unpublished
      until it is added to `allowlist.txt`.
- [ ] **Rotate `TM_GH_TOKEN`.** The scheduled sync fails with "Invalid username or token", so no
      sync runs until it is replaced.
