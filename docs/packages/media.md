# `@tgmc/media`

Node / Nitro / Lambda media catalog library for TGMC portfolio apps.

Package README: [`packages/media/README.md`](../../packages/media/README.md).

## Role

| Concern                                                          | Owner                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------- |
| Asset inventory (image / svg / audio / video / model / document) | This package                                                |
| Child recipes + materialize                                      | This package                                                |
| Image pixel transforms                                           | `@tgmc/image` (composed)                                    |
| SVG / audio / video / model / document transforms                | Placeholders (`TransformerNotImplementedError`) until later |
| Local catalog / jobs / audit                                     | SQLite adapter                                              |
| Local blobs                                                      | `FsBlobStore` (filesystem, behaves like the S3 bucket)      |
| AWS DynamoDB / S3 / Lambda                                       | `@tgmc/media-aws` + `@tgmc/media-nuxt` `/api/media/*`       |
| Admin grid / multi-upload UI                                     | `@tgmc/admin` `/admin/media` + `/api/admin/media/*`         |
| Nuxt / Next host adapters                                        | `@tgmc/media-client` + `@tgmc/media-nuxt`                   |

Requirements: [`docs/plans/2026-09-22-001-feat-media-library-sdk-plan.md`](../plans/2026-09-22-001-feat-media-library-sdk-plan.md) · Admin UI: [`docs/plans/2026-09-22-003-feat-admin-media-ui-plan.md`](../plans/2026-09-22-003-feat-admin-media-ui-plan.md) · Hosts: [`docs/plans/2026-09-22-004-feat-media-host-adapters-plan.md`](../plans/2026-09-22-004-feat-media-host-adapters-plan.md).

## API surface

```ts
import { createMediaLibrary } from '@tgmc/media';

const { library, close } = createMediaLibrary({
  dbPath: './data/media.sqlite',
  blobDir: './data/media-blobs',
});

await library.ingest({
  kind: 'image',
  data: './a.png',
  mime: 'image/png',
  meta: { tags: ['hero', 'logo'] },
});
await library.addAssetTags(assetId, ['brand']);
await library.listAssets({ tag: 'hero' });
await library.materializeChild(assetId, null, null, { variant: '640' }); // catalog variant
await library.materializeChild(assetId, 'square', {
  kind: 'image',
  ops: [{ type: 'resize', ops: { width: 800, height: 800 } }],
  format: 'webp',
}); // custom recipe
await library.deleteAsset(assetId); // hard cascade, frees the name
close();
```

## Keys, names and variants

The key is the URL. The same string is the CDN path, the MinIO/S3 key, the host-dev URL and the storage key (no leading slash on keys):

```
m/{tenant}/{kind}/{name}.{ext}              original
m/{tenant}/{kind}/{name}@{variant}.{ext}    processed variant
```

| Part      | Values                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------- |
| `tenant`  | `pf` portfolio (default), `ha` hyperactivity (`TENANT_CODES`)                                     |
| `kind`    | `i` image, `s` svg, `v` video, `a` audio, `d` document, `o` model (`KIND_CODES`)                  |
| `name`    | lowercase kebab-case; the whole filename (`name.ext`) is at most 36 characters                    |
| `variant` | `t` (320 px), `640`, `1280`, `1920`, or `c-{8 hex}` for a custom recipe; `p` (poster) is reserved |

`@tgmc/media` exports `originalKey`, `variantKey`, `parseMediaKey` (`paths.ts`), `normalizeMediaFilename` (`meta-policy.ts`), `slugMediaFilename` (`filename.ts`) and the variant helpers (`variants.ts`). `MediaAsset` carries `tenant`, `name` and `path`; `MediaChild` carries `variant` and `path`. The asset id stays an internal DB key and never appears in a URL.

### Filenames

`slugMediaFilename` is mechanical: basename only, accents stripped, lowercase kebab-case ASCII, extension at most 8 alphanumerics, truncated so `name.ext` is at most 36 characters, `untitled` when nothing is left. The SQLite migration backfill uses it so existing names never change.

`normalizeMediaFilename` is the policy name every ingest uses (`ingest`, `reserveName`, `registerRemoteAsset`): it first drops generator prefixes (`vimg`, `mj`, `midjourney`, `dall-e`, `firefly`, `sora`, `chatgpt`), camera prefixes (`IMG_`, `DSC_`, `PXL_` …), UUIDs, long hex tokens, digit runs of 10 or more and single-letter middle initials, then slugs the rest (falling back to the plain slug when nothing is left). `Tamara G Mack_Resume_2026.pdf` → `tamara-mack-resume-2026.pdf`; `vimg-tesseract-framework.mp4` → `tesseract-framework.mp4`.

`IngestInput` takes optional `filename` and `tenant`; without a filename the name comes from the file path (when `data` is a path), else `{kind}-{first 8 of the sha256}.{ext}`. Only an explicit `mime` is checked against the extension; without one the extension decides the mime, and an extensionless name takes the extension of the resolved mime.

### Metadata policy

`validateMediaMeta(kind, meta, { computed? })` → `{ ok, issues, meta }` (`assertMediaMeta` throws `RecipeValidationError` instead). Rules (`MEDIA_META_LIMITS`): `title` required, 3–80 characters; `alt` at most 150 and required for `image` and `svg` (and `video` with a `posterId`); `description` at most 300; `credit` at most 80, defaulting to `DEFAULT_MEDIA_CREDIT` (`Tamara Mack`). Text fields must be human text, not identifiers: UUIDs, long hex, camera names, generator prefixes (`vimg`; `mj` only before `_` / `-` or alone, since `MJ` is also initials), vendor job ids and filenames are rejected. `width` / `height` / `durationSec` are computed fields and are rejected unless `computed: true` (the site import sets it).

`MediaLibrary` checks the policy on `ingest` (before anything is reserved or written) and `registerRemoteAsset` only when constructed with `enforceMetaPolicy: true` (`createMediaLibrary({ enforceMetaPolicy })`). It is off by default because admin uploads do not collect title and alt yet; the site import always enforces it. Turning it on for admin is part 2 of PR 5.

### Variants

- **Catalog variants** (`t`/`640`/`1280`/`1920`): one child per (asset, variant, format). Output is webp by default; `webp`, `avif`, `jpeg` and `png` are selectable, and the format is told apart by extension (`hero@640.webp` next to `hero@640.avif`; `jpeg` uses `.jpg`). Re-materializing an existing (variant, format) **replaces the object at the same key** and reuses the child; the `hooks.afterReplace` hook runs so a CDN can drop the stale copy (`createAwsMediaLibrary` wires it to CloudFront invalidation when `ASSETS_DISTRIBUTION_ID` is set). A recipe that is exactly a width-only resize to 320/640/1280/1920 with no quality override is recognised as the catalog variant.
- **Custom recipes**: `variant: 'custom'`, keyed `@c-{first 8 hex of the child id}`, a fresh child each time, never overwritten.
- `role` is a free label (defaults to the variant code).
- `p` is rejected with a validation error. Posters will be separate image assets linked through `meta.posterId`.
- Because keys have no attempt suffix, a retry or a stale worker writes the same key. The library never deletes a variant key on a lost lease or when replacing a live object; it deletes only when the asset is gone or after a successful requeue by the sole owner.

### Name reservation

A name (the key without its extension) is unique per **(tenant, kind)**, whatever the extension. `hero.png` and `hero.jpg` cannot coexist: a variant key drops the original's extension (`m/pf/i/hero@640.webp`), so two originals sharing a name would overwrite each other's variants and deleting one would delete the other's. SQLite enforces it with `UNIQUE(tenant, kind, name)`; DynamoDB with a `NAME#` item (see [media-aws](./media-aws.md)).

- `library.reserveName({ kind, filename, mime?, tenant? })` holds the name (and the path it will be uploaded to) for a new asset id for 30 minutes (presigned uploads use this). `insertAsset` atomically claims the name or consumes the asset's own reservation. Expired reservations read as free.
- `reserveName` also rejects a filename whose extension disagrees with the mime (`x.png` with `image/jpeg`) as a `RecipeValidationError` (HTTP 400) that names the corrected filename (`x.jpg`); `jpeg`/`jpe` count as `jpg`. Unknown mimes accept any extension. `ingest` derives the mime from the filename extension when none is given.
- **Abandoned presigned uploads.** If a PUT succeeded but `complete` never ran, the reservation lapses but the object stays, and the next uploader's `If-None-Match: *` PUT would fail with 412. `reserveName` therefore deletes a blob at the target path that has no live row or reservation and records a `blob.stray_removed` audit event before handing out the new reservation.
- A taken name (any extension) throws `MediaNameConflictError` (a `MediaConflictError`) with `path`, `suggestedName`, `suggestedFilename` and `suggestedPath`: the next free `-2`, `-3`, … suffix (truncated to keep the filename within 36 characters). The suggestion checks the name, not the path (`hero.png` taken → `hero-2.jpg` for a `hero.jpg` upload). HTTP hosts call `mediaErrorToHttp(err)` (exported from `@tgmc/media`; also maps other conflicts to 409, not found to 404, validation to 400) and pass the result to `createError`; the 409 body is `data.code = 'name_conflict'` plus the suggestion. `@tgmc/media-client` parses it back with `parseNameConflictData`.
- Deleting an asset (`deleteAsset`, `deleteAssetCascade`) frees its name immediately.
- `registerRemoteAsset` takes the reserved `path` instead of a blob key and checks it parses as an original key of the asset's kind.

### S3 object headers

`BlobStore.put(key, data, { contentType, cacheControl, contentDisposition, createOnly })`. `createOnly` refuses to replace an existing object: it throws `MediaBlobExistsError`, sent as `If-None-Match: *` on S3 (where 412 and 409 map to that error) and published through an exclusive link on `FsBlobStore`. `MediaLibrary` passes the asset mime, `public, max-age=31536000, immutable` and `inline; filename="<name>.<ext>"` (`objectHeaders(contentType, key)`, also used by `transferMedia`). `S3BlobStore` sets them as object metadata; `FsBlobStore` keeps them in its sidecar (below). Presigned browser uploads sign the full `PRESIGN_REQUIRED_HEADERS` set (`Content-Type`, `If-None-Match`, `Cache-Control`, `Content-Disposition`; see [media-aws](./media-aws.md)), so those objects carry the same cache and download headers as server-side puts.

### Filesystem blob store

`FsBlobStore(root)` is the local stand-in for the S3 bucket, so host dev and `DATA_BACKEND=sqlite|postgres` behave like AWS:

- **Layout.** A blob lives at `<root>/<key>` (`<root>/m/pf/i/manhattan-keyframe.png`): the disk path, the S3 key and the URL are the same string. `createMediaLibrary` uses `<blobDir>`; `@tgmc/media-nuxt` uses `<MEDIA_LOCAL_ROOT>/blobs`.
- **Object metadata.** A `<key>.meta.json` sidecar holds `contentType`, `byteSize`, `sha256`, `etag` (the quoted MD5, as S3 returns for a single PUT) and, when given, `cacheControl` / `contentDisposition` (`FsBlobMeta`, `FS_BLOB_META_SUFFIX`). `readMeta(key)`, `head(key)` (same shape as `S3BlobStore.head`) and `stat(key)` read it. The sidecar also records a `generation` (inode, mtime in ns and size of the file it was written for). A variant's body and sidecar are published by two renames, so a reader between them, or a crash, could otherwise pair new bytes with the old ETag/SHA-256. A blob without a sidecar, or whose sidecar was written for another file (a same-size variant replacement, blobs moved by the SQLite migration below, files copied in by hand), gets metadata derived from the file: type from the extension, hashes computed on read.
- **Create-only originals.** A write to an original key (no `@variant`) goes to a temp file and is published with an exclusive hard link (an exclusive copy where links are unsupported). A second write to the same original throws `MediaBlobExistsError`, which `mediaErrorToHttp` maps to **412**, like a presigned PUT with `If-None-Match: *`. Variant keys overwrite in place (temp file + rename), as catalog re-materialize needs, unless the put passes `createOnly` (the transfer does). `delete` removes the blob and its sidecar, so the name can be uploaded again.
- **Streaming.** `putStream(key, source, { maxBytes, ...headers })` hashes while writing and never buffers the whole body; past `maxBytes` it throws `MediaBlobTooLargeError` (**413**) and leaves nothing behind. `digestSha256(key)` re-reads the file. `openRead(key)` serves it: it opens the file once and returns `{ meta, stream(), close() }`, where `meta` describes exactly the bytes `stream()` reads, even if the key is overwritten mid-request.
- **Key guard.** Every operation first checks that the key is a valid media key (`parseMediaKey`) with no empty, `.` or `..` segment, no backslash and no NUL, and that it resolves inside the root. Anything else (traversal, absolute or drive paths, sidecars, temp files) is a `RecipeValidationError` (400) before the disk is touched, so sidecars and temp files can never be read through a key.

### SQLite migration

`openMediaDatabase(dbPath, { blobDir })` migrates older databases in place and idempotently: it adds `tenant`, `name`, `path` (assets) and `variant`, `path` (children), backfills names from `meta.filename` (else `{kind}-{id8}`, de-duplicated with numeric suffixes), marks old children as `custom`, renames later assets that collide on (tenant, kind, name) across extensions with `-2`, `-3` (their variants are re-keyed; when two assets shared a variant key, the one object at that key cannot be attributed, so **both** children are marked `failed` and need re-materializing), creates the unique `(tenant, kind, name)` index (replacing the old `path` index and `media_path_reservations` table with `media_name_reservations`; a colliding row whose key cannot be parsed aborts the migration with an error naming the row), then **moves blobs on disk** from the legacy `blob_key` to the new `path`. `blob_key` stays as a legacy column. A missing file keeps its row pending for the next run; an existing destination marks the row done. Moved blobs have no sidecar; `FsBlobStore` derives their metadata. Take a copy of `data/` first.

### Kind vs tags / meta

| Field         | Role                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `kind`        | Exclusive processing pipeline (`image` / `svg` / `audio` / `video` / `model` / `document`)                          |
| `meta.tags`   | Many editorial labels (`hero`, `lottie`, project names) — normalized lowercase kebab                                |
| `meta` facets | Pipeline hints without new kinds: `animated`, `hdr`, `panorama`, `designSource`, `motionFormat` (`ASSET_META_KEYS`) |

List with `?tag=` (admin + `/api/media`). PATCH `…/assets/:id` with `{ tags }` or `{ meta }` to update.

## Transfer between backends

`transferMedia` copies a catalog and its objects from one backend to another through the ports only (no AWS import in this package). It seeds production from a local catalog and pulls backups the other way. Operators use the `npm run media:transfer` CLI (runbook).

```ts
import { createSqliteMediaStores, transferMedia, type MediaEndpoint } from '@tgmc/media';
import { S3BlobStore, createDynamoMediaStores } from '@tgmc/media-aws';

const local = createSqliteMediaStores({
  dbPath: './data/admin-media/media.sqlite',
  blobDir: './data/admin-media/blobs',
});
const dynamo = createDynamoMediaStores({ tableName: 'portfolio-prod-Media', region: 'us-west-2' });
const target: MediaEndpoint = {
  catalog: dynamo.catalog,
  audit: dynamo.audit,
  blobs: new S3BlobStore({ bucket: 'portfolio-prod-assets-<account>', region: 'us-west-2' }),
};
const report = await transferMedia({ source: local, target, dryRun: true });
local.close();
```

- **Endpoints.** `MediaEndpoint = { catalog, blobs, audit? }`. `createSqliteMediaStores({ dbPath, blobDir })` returns the SQLite stores plus an `FsBlobStore` and `close()` (`createMediaLibrary` is built on it). With `readOnly: true` the catalog is never created, migrated or written: an existing file opens as it is, a missing one reads as an empty catalog, and catalog writes throw (combining it with a pre-opened `database` throws). The CLI uses this for a dry-run `sqlite:` target. On AWS, combine `createDynamoMediaStores` with `S3BlobStore` ([media-aws](./media-aws.md)).
- **Options.** `dryRun` (read both sides, write nothing), `includeChildren` (default `true`), `pageSize` (default 100), `tenants` (default: every tenant), `correlationId` (recorded on the audit events; default: a new id per run), `auditAction` (default `asset.transferred`). The source is read page by page with `listAssets` for each tenant. The source only needs `MediaTransferSource` (`catalog.listAssets` / `listChildren`, `blobs.get` / `digestSha256`), so an in-memory source works (the site import uses one).
- **Copy.** Each object is read from the source and checked against the catalog `sha256`. It is written with the same headers `MediaLibrary` uses (`objectHeaders`: the mime, `public, max-age=31536000, immutable`, `inline; filename="<name>.<ext>"`), then re-hashed on the target (`BlobStore.digestSha256`, optional on the port; implemented by `FsBlobStore` and `S3BlobStore`). Only after that check passes is the row written with `insertAsset`. The row keeps `id`, `tenant`, `name`, `path`, `meta` and the timestamps, so URLs are the same in both environments. On DynamoDB, `insertAsset` writes the `NAME#` claim in the same transaction. If `insertAsset` throws but a re-read finds the row with the same `sha256` (a timeout after the commit), the asset counts as copied and its object stays. If the re-read itself throws, the object also stays (it may back a landed row; an orphan object is harmless and the next run adopts it) and the asset is recorded in `failed`. Child inserts follow the same rule, re-reading with `listChildren`. Before adopting an object already at the key, the source object is still hashed and checked against the catalog `sha256`. On DynamoDB, `getAsset` is a strongly consistent read, so the re-read and the skip check see a row that just committed.
- **Concurrent uploads on the target.** Before writing anything (not in a dry run), the transfer holds the asset's name on the target with `holdName` for `TRANSFER_NAME_HOLD_MS` (15 minutes). This is the same reservation an admin upload takes. If the hold is refused, the asset is a conflict and nothing is written. On any failure before `insertAsset` succeeds, `releaseName` frees the hold; `insertAsset` consumes it on success (SQLite deletes the reservation in its transaction, and DynamoDB's `NAME#` claim replaces it). Objects are written with `BlobPutOptions.createOnly` (S3 `If-None-Match: *`; `FsBlobStore` publishes through an exclusive link). An object that appears at the key between the existence check and the put (412, or 409 `ConditionalRequestConflict`, surfaced as `MediaBlobExistsError`) is therefore a conflict. It is never overwritten, and the cleanup never deletes it. Remaining gap: children are not covered by the name hold. A media worker on the target re-materializing the same variant key overwrites in place (variants are not create-only for workers). So if it writes between the transfer's create-only put and a failed child insert, the transfer's cleanup can delete the worker's object. The worker's child then needs to be materialized again. Keep the target quiet during a transfer.
- **Children.** Only `ready` children with a path are copied, keeping their ids and variant keys (`m/pf/i/hero@t.webp`), through `insertChildIfAssetExists`. A child whose path is not a variant of its asset's name fails.
- **Reruns are idempotent.** If the target already has the same id with the same `sha256` and path, and its object exists, the asset is `skipped` (the object is not re-hashed; a child with the same id and path is skipped on the same terms). Any ready children it lacks are still copied, so a rerun finishes a half-done copy. An identical object already at the key, with no row (an earlier run stopped after the write), is reused rather than written again.
- **Conflicts are never overwritten.** These are reported in `conflicts`, with the reason in `conflictReasons[id]`:
  - the same id with another `sha256` or path
  - the name (tenant, kind, name, any extension) held on the target by another id, including a pending upload, whether it was held before the run or taken during it
  - different bytes already at the key, or an object that appeared there during the run (`MediaBlobExistsError` maps to a conflict)
  - a child id or path already used on the target
- **Failures.** These go into `failed` (`{ id, error }`) and the run continues: a missing or corrupt source object, a target object that fails the re-hash, a failed insert, or an asset or child already on the target whose object is missing there. The run never writes a row without a verified object, and it normally deletes any object it wrote for a failed item. The exceptions keep data in place: a failed insert whose re-read also failed keeps the verified object (its row may have landed; a rerun adopts it), an existing row whose object is missing stays as it is, and an `audit: …` failure keeps everything that was copied. A source `listAssets` error stops that tenant's listing and is recorded as `listing <tenant> (offset <n>)`. The other tenants still run, and the partial report is returned.
- **History.** Jobs and audit history are not copied. For every asset the run wrote (the asset or any of its children), the target gets one `asset.transferred` audit event (`TRANSFER_AUDIT_ACTION`). Its payload is `{ path, sha256, assetCopied, children }`. If appending the event fails, the copied data stays and the failure is added to `failed` as `audit: …`.
- **Report.** `TransferReport` has `copied` / `skipped` / `conflicts` / `conflictReasons` / `failed` for asset ids, the same fields under `children` for child ids, `dryRun`, and `sourceCount` (source assets seen). In a dry run, `copied` lists what would be copied. A dry run still reads and hashes the source objects, so it also catches missing or corrupt ones.
- Don't write to the source while a transfer runs. Paging is by offset (SQLite orders by `created_at DESC, id DESC`), so new rows could shift the pages. Opening a SQLite catalog also runs its migrations ([SQLite migration](#sqlite-migration)).

## Site media manifest and import

The site's own media is described by a reviewed manifest (`core/web/content/media.json`) and imported with fixed ids. Workflow and CLIs: [site media](../web/features/site-media.md).

- `site-manifest.ts`: `SiteMediaEntry` / `SiteMediaManifest` types, `validateSiteManifest(value)` → `{ manifest | null, errors, metaIssues }` (strict keys, path / kind / name / ext agreement, an `ext` whose MIME type belongs to `kind`, UUID ids, sha256, catalog variants, `legacyPath` without `.` / `..` segments, uniqueness of id, name and legacy path; policy issues per id), `siteMediaId(legacyPath)` (UUIDv5 under `SITE_MEDIA_ID_NAMESPACE`), `uniqueSiteMediaName`, `siteEntryToAsset` / `siteEntryFromAsset` (round trip with the catalog; meta gets `tags: ['site']`, never `reviewNotes`), `serializeSiteManifest` (stable key order, trailing newline).
- `site-import.ts`: `importSiteMedia({ items: [{ entry, bytes }], target, dryRun?, allowUnreviewed?, correlationId? })` (`bytes` is a `Buffer` or a loader, called only for entries it imports). Refuses entries with review notes or policy issues, skips entries the target already has with the same id, path and `entry.sha256` (checked before the bytes are loaded, so reruns survive sanitizer upgrades and need no ffmpeg), fails entries whose loader throws or whose bytes do not match `entry.sha256`, and copies the rest through `transferMedia` (in-memory source, no children, `auditAction: 'asset.site_imported'`). `siteImportSucceeded(report)` is false on any refusal, conflict or failure.

## CLI

```bash
npm run build --workspace=@tgmc/media
node packages/media/bin/media.mjs smoke --db /tmp/m.sqlite --blob-dir /tmp/m-blobs
```

`bin/media.mjs` is the only executable entry (it owns `process.exit`). `src/cli.ts` exports `runCli(argv)` → exit code and must stay free of import-time side effects: it is bundled into server builds via the package entry, where a "run if main" guard fired and exited the admin server ([solution](../solutions/build-errors/library-cli-self-exec-in-nitro-bundle.md); guarded by `tests/cli-import.spec.ts`).

## Boundaries

- Node-safe root: the package root also exports the fs / SQLite / crypto adapters, so client code must not import it.
- `@tgmc/media/kinds` is the one browser-safe entry (`src/kinds.ts`, no imports): `MEDIA_KINDS`, `isMediaKind`, `guessMediaKind`, `defaultMimeForKind`, `extensionForMime`, `extensionMatchesMime`, `mimeForExtension`. The admin media page uses it (`core/admin/tests/media-page-ui.spec.ts` fails if a client file imports the root).
- Does not replace `/api/image/*` on-demand transforms; those stay on `@tgmc/image` + web handlers.
- Does not own CDN upload or CloudFront invalidation (step 2).
