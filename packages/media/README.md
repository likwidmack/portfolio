# `@tgmc/media`

Server-side media catalog and lifecycle library for TGMC apps (Node / Nitro / Lambda).

Docs: [`docs/packages/media.md`](../../docs/packages/media.md).

## Install / build

```bash
npm run build --workspace=@tgmc/media
npm test --workspace=@tgmc/media
```

## Quick start

```ts
import { createMediaLibrary } from '@tgmc/media';

const { library, close } = createMediaLibrary({
  dbPath: './data/media.sqlite',
  blobDir: './data/media-blobs',
});

const asset = await library.ingest({ kind: 'image', data: './photo.png', mime: 'image/png' });
const { child, job } = await library.materializeChild(asset.id, 'thumb', {
  kind: 'image',
  ops: [{ type: 'resize', ops: { width: 320 } }],
  format: 'webp',
});

close();
```

## CLI

```bash
node packages/media/bin/media.mjs smoke --db /tmp/media.sqlite --blob-dir /tmp/media-blobs
```

`bin/media.mjs` is the only executable entry; `src/cli.ts` (`runCli`) has no import-time side effects and never calls `process.exit` — see [docs/packages/media.md](../../docs/packages/media.md#cli).
