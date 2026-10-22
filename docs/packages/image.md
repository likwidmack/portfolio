# `@tgmc/image`

Node / Nitro / Lambda image library for TGMC portfolio apps.

Package README: [`packages/image/README.md`](../../packages/image/README.md).

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

## Sanitize media before it is stored

`@tgmc/image/sanitize` (a separate subpath, **not** re-exported from the package entry, so svgo, pdf-lib and the ffmpeg call never reach the Nitro / Lambda bundle; guarded by `tests/entry-boundary.spec.ts`) strips third-party identifiers before bytes are hashed and stored. Output is deterministic for the same input, options and tool versions.

svgo, pdf-lib and ffmpeg-static are **optional peerDependencies** (svgo and pdf-lib are also devDependencies for the package tests; the root `package.json` provides all three to the scripts, ffmpeg-static as an optional dependency). The MediaWorker Lambda that `scripts/sam-build.mjs` stages from `@tgmc/media-aws` → `@tgmc/media` → `@tgmc/image` runtime dependencies therefore never installs them; the entry-boundary test also checks the `package.json`.

```ts
import {
  probeMedia,
  resolveFfmpegPath,
  sanitizeFormatForFilename,
  sanitizeMedia,
  sniffSanitizeFormat,
} from '@tgmc/image/sanitize';

const format = sniffSanitizeFormat(bytes) ?? sanitizeFormatForFilename(filename);
const ffmpegPath = format === 'mp4' ? (resolveFfmpegPath() ?? undefined) : undefined;
const clean = await sanitizeMedia(bytes, { format, document: { title, author, subject }, ffmpegPath });
const { width, height, durationSec } = await probeMedia(clean, format);
```

`resolveFfmpegPath()` returns `FFMPEG_PATH`, else `ffmpeg` when it runs from `PATH`, else the optional `ffmpeg-static` binary (loaded with `createRequire` at call time; its `FFMPEG_BIN` variable overrides that binary), else `null`; `sanitizeMedia` for an MP4 without one throws `FFMPEG_NOT_FOUND`, which says how to provide it. ffmpeg (GPL-3.0-or-later as shipped by ffmpeg-static) runs as a separate process and is never bundled or redistributed.

| Format                         | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| JPEG / PNG / WebP / AVIF / GIF | sharp re-encode with EXIF orientation applied; EXIF, XMP, IPTC and PNG text / C2PA chunks dropped; the **ICC profile is kept**; GIF / WebP animation kept. JPEG / WebP / AVIF are lossy re-encodes (q92 4:4:4 / q90 / q70); PNG stays lossless.                                                                                                                                                                                                                                      |
| SVG                            | svgo: doctype, XML declaration, comments, `<metadata>` and editor namespaces (Inkscape, Sodipodi, Figma `data-*`) removed; ids nothing references removed; `<title>` / `<desc>` kept. Also removes `<script>`, every `on*` attribute (any case or prefix), `<foreignObject>`, elements in a non-SVG namespace, `xml:base`, href animations and any `href` / `xlink:href` that is not `#fragment` or a png / jpeg / gif / webp / avif `data:` URL. CSS in `<style>` is not sanitized. |
| PDF                            | pdf-lib: the Info dictionary is replaced by the given Title / Author / Subject only (Title required; a source Author / Subject with no replacement is removed), XMP `/Metadata`, `/PieceInfo` and unreachable objects removed, the trailer `/ID` dropped.                                                                                                                                                                                                                            |
| MP4                            | ffmpeg remux (`-c copy`, no re-encode; `-map 0:V` skips attached cover pictures) with global and stream metadata, chapters and data streams dropped, bit-exact flags and `+faststart`. Needs `ffmpegPath` (`resolveFfmpegPath()`).                                                                                                                                                                                                                                                   |

`sniffSanitizeFormat(bytes)` trusts magic bytes over the extension (a `.png` that is really a GIF stays animated). `scanForIdentifiers(bytes, format)` lists leftover metadata structures and `IDENTIFIER_DENYLIST` tokens (C2PA, XMP document ids, Adobe, Midjourney, DALL, openai, Figma, Inkscape, Sodipodi) in the metadata-bearing bytes; the tests assert it is empty after sanitizing. Known gap: the x264 encoder string inside the H.264 bitstream (SEI) survives a remux, because removing it means re-encoding.

Callers: the site media manifest and import ([site media](../web/features/site-media.md)). Admin uploads are not sanitized yet.

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

Script: `scripts/enrich-image-meta.mjs` (dedupes by file path; also enriches video `poster` fields). Run it on a workstation and commit the JSON: GitHub Actions never run it (cicd.md § No media work in GitHub Actions). CD only copies the committed files under `public/i` until plan PR 5a moves site media into the catalog.

## Build / test

```bash
npx nx run @tgmc/image:build
npx nx run @tgmc/image:test
```
