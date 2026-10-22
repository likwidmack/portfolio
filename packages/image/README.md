# `@tgmc/image`

Node / Nitro / Lambda image helpers: ingest (thumb + LQIP + dominant color), pixel color/geometry transforms (`sharp`), and on-demand transform support.

Longer reference: [`docs/packages/image.md`](../../docs/packages/image.md).

## Install / workspace

```bash
npm run build --workspace=@tgmc/image
```

Depends on `@tgmc/theme` (JS `Color` / enhance), `@tgmc/utilities` (`Logging`, `sha256Hex`, CDN),
`@tgmc/utilities/universal` (`aspectRatio`), and `sharp`.

## Quick example

```ts
import { ingestImage, transformImage } from '@tgmc/image';

const asset = await ingestImage('/path/to/photo.jpg', { thumbOutPath: './public/i/_derived/photo.thumb.webp' });
asset.lqip; // data:image/webp;base64,...
asset.dominantColor; // #rrggbb

const { buffer, contentType } = await transformImage('/path/to/photo.jpg', [
  { type: 'resize', ops: { width: 1200, fit: 'inside' } },
  { type: 'color', ops: { saturation: 1.1 } },
]);
```

CDN upload / media inventory is owned by a separate media-management plan — this package returns relative paths and `ImageAsset` metadata only.
