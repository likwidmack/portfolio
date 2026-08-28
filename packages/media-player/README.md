# @tgmc/media-player

TypeScript media player with an owned **Media Source Extensions (MSE)** pipeline for HLS, plus progressive MP4 via `video.src`.

## Features

- `TgmcPlayer` facade: play, pause, seek, load asset/playlist, destroy
- Owned `MediaSourceEngine` with serialized `SourceBuffer` appends
- HLS VOD and live loaders (`m3u8-parser`, optional `mux.js` transmux for TS segments)
- Playlist continuous play, ad-cue hooks (enter/exit events), WebVTT via native `<track>`
- Safari: `ManagedMediaSource` when available; native HLS fallback emits `playbackmodechange`

## Install (monorepo)

```bash
npm install
npm run build --workspace=@tgmc/media-player
```

## Usage

```ts
import { TgmcPlayer } from '@tgmc/media-player';

const video = document.querySelector('video')!;
const player = new TgmcPlayer(video);
await player.load({ url: 'https://example.com/video.mp4', kind: 'progressive' });
await player.play();
```

## Commands

```bash
npm run build --workspace=@tgmc/media-player
npx nx run @tgmc/media-player:test
```

## Demo

`core/web` → `/media-player` (run `npm run build:libs` then `npm run dev`).

## Docs

- Workspace packages hub: [`docs/packages/README.md`](../../docs/packages/README.md)
- MSE plan (limits / deferred work): `docs/plans/2026-07-27-001-feature-media-player-mse-plan.md`

## v1 limits

See the MSE plan above (live DVR, AES-128, multi-audio, LL-HLS deferred).
