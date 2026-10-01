# `@tgmc/media`

Node / Nitro / Lambda media catalog library for TGMC portfolio apps.

Package README: `packages/media/README.md`.

## Role

| Concern                                                          | Owner                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------- |
| Asset inventory (image / svg / audio / video / model / document) | This package                                                |
| Child recipes + materialize                                      | This package                                                |
| Image pixel transforms                                           | `@tgmc/image` (composed)                                    |
| SVG / audio / video / model / document transforms                | Placeholders (`TransformerNotImplementedError`) until later |
| Local catalog / jobs / audit                                     | SQLite adapter                                              |
| Local blobs                                                      | Filesystem adapter                                          |
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
await library.materializeChild(assetId, 'thumb', {
  kind: 'image',
  ops: [{ type: 'resize', ops: { width: 320 } }],
  format: 'webp',
});
await library.deleteAsset(assetId); // hard cascade
close();
```

### Kind vs tags / meta

| Field         | Role                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `kind`        | Exclusive processing pipeline (`image` / `svg` / `audio` / `video` / `model` / `document`)                          |
| `meta.tags`   | Many editorial labels (`hero`, `lottie`, project names) — normalized lowercase kebab                                |
| `meta` facets | Pipeline hints without new kinds: `animated`, `hdr`, `panorama`, `designSource`, `motionFormat` (`ASSET_META_KEYS`) |

List with `?tag=` (admin + `/api/media`). PATCH `…/assets/:id` with `{ tags }` or `{ meta }` to update.

## CLI

```bash
npm run build --workspace=@tgmc/media
node packages/media/bin/media.mjs smoke --db /tmp/m.sqlite --blob-dir /tmp/m-blobs
```

## Boundaries

- Node-safe only — no browser entry.
- Does not replace `/api/image/*` on-demand transforms; those stay on `@tgmc/image` + web handlers.
- Does not own CDN upload or CloudFront invalidation (step 2).
