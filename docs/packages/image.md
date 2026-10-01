# `@tgmc/image`

Node / Nitro / Lambda image library for TGMC portfolio apps.

Package README: `packages/image/README.md`.

## Role

| Concern                                                            | Owner                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Raster brightness / contrast / saturation / grayscale / chroma-key | `sharp` in this package                                             |
| CSS color parse, HSL/hex, dominant polish                          | `@tgmc/theme` `Color` / `Color.enhance`                             |
| Cache keys                                                         | `@tgmc/utilities` `sha256Hex`                                       |
| Aspect ratio meta (SSR + client)                                   | `@tgmc/utilities/universal` `aspectRatio`                           |
| LQIP `data:` URLs                                                  | Local helpers in this package (`toLqipDataUrl`) — not utilities yet |
| Overlay ink vs dominant swatch                                     | `@tgmc/theme` `pickContrastingInk` (UI)                             |
| Sass `theme-*` color-fns                                           | Vue SCSS only — **never** imported into this Node package           |

CDN upload, invalidation, and **asset inventory** belong to [`@tgmc/media`](./media.md) + [`@tgmc/media-aws`](./media-aws.md). This package returns relative paths and `ImageAsset` metadata and is composed by `@tgmc/media` for image child materialize.

**Env gate:** Nitro `/api/image/*` handlers call `assertImageApiEnabled()` and only run when raw `SYS_ENV` is exactly `local`, `development`, or legacy `remote`. Empty, missing, typo, `test`, and `production` return 404 (fail-closed — does not use `normalizeSysEnv`, which defaults unknown values to `local`).

## API surface

```ts
import { ingestImage, transformImage, ImageAsset, enhancePixels, applyTransparency, resizeImage } from '@tgmc/image';
```

- `ingestImage(input, options?)` → `ImageAsset` with thumb (optional disk write), LQIP data URL, polished dominant color, dimensions
- `transformImage(input, ops[], options?)` → `{ buffer, contentType, meta }`
- Ops: `color` | `mono` | `transparency` | `resize` | `crop` | `format`

## Web wiring (`core/web`)

- `GET /api/image/transform?src=…&w=…&format=webp&quality=80&ops=[…]` — on-demand variants
  - Query `format` / `quality` own the encode; nested `type:"format"` ops are rejected (400)
  - Response headers: `Content-Type`, `Cache-Control`, `X-Image-Cache` (HIT|MISS), `X-Image-Width` / `X-Image-Height`
  - Disk cache under `.cache/image/` with atomic writes + `.meta.json` sidecars for HIT dims
- `POST /api/image/ingest` `{ src, thumbLongEdge?, lqipLongEdge?, enhanceDominant? }` — returns delivery DTO (`thumbSrc`, `lqip`, `dominantColor`, dims); thumb under `public/i/_derived/`
- `UiImage` — LQIP / dominant placeholder + `NuxtImg` fade-in (gallery + work cards + case-study detail rasters)

Does **not** replace `@nuxt/image` / IPX for ordinary static assets.

## Content LQIP metadata

Gallery exhibits and case-study media store optional `lqip` / `dominantColor` / `aspectCss` in Nuxt Content JSON (SSR-safe; no runtime sharp in test/prod).

Regenerate after adding rasters under `core/web/public/i/`:

```bash
npm run build --workspace=@tgmc/image
npm run content:enrich-images
# preview: npm run content:enrich-images -- --dry-run
```

Script: `scripts/enrich-image-meta.mjs` (dedupes by file path; also enriches video `poster` fields).

## Build / test

```bash
npx nx run @tgmc/image:build
npx nx run @tgmc/image:test
```
