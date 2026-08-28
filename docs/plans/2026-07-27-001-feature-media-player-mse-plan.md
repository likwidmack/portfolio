---
title: Media Player MSE Package - Plan
date: 2026-07-27
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
type: feature
topic: media-player-mse
---

# Media Player MSE Package - Plan

## Goal Capsule

- **Objective:** Ship `@tgmc/media-player` as a reusable TypeScript media player with an owned Media Source Extensions (MSE) engine, domain models for assets/playlists/events, and a thin Nuxt demo that only validates the package API.
- **Product authority:** This Product Contract. Behavioral reference: ndp-video-spa player/playlist/event patterns (not a line-for-line port).
- **Execution profile:** Build bottom-up (engine → loaders → facade → demo). Prove Safari alongside Chromium in the demo manual checklist. Primary playback is owned MSE; native HLS on `video.src` is allowed only per KTD4/R12 when MSE init fails.
- **Stop conditions:** Do not integrate FreeWheel, SRT, DRM, or DASH. Do not adopt hls.js as the playback engine.
- **Open blockers:** None.

## Product Contract

**Product Contract preservation:** Changed R4 clarification, added R12/AE6, KD9–KD10, resolved Q1/Q3/Q4; planning resolved Q2 live limits.

### Summary

Build a modular, library-first video player package that owns `MediaSource` / `SourceBuffer` lifecycle, plays HLS VOD, live HLS, and progressive MP4, exposes playlist/asset/ad-cue APIs, and wires WebVTT via native text tracks. A thin `core/web` page proves the API; FreeWheel and polished SPA chrome stay out. Safari is a first-class target via owned MSE (with a documented native-HLS fallback only when MSE cannot be initialized).

### Problem Frame

The portfolio already has a stub `@tgmc/media-player` package and a historical NBC ndp-video-spa player (Knockout/RequireJS, hls.js adapter, FreeWheel, playlist tooling). Reusing that surface for a modern TypeScript library needs a clear product shape: own MSE rather than treat hls.js as the engine, keep ads as hooks only, and make the package—not the demo—the product.

### Key Decisions

- **KD1. Full package surface (playlist, assets, events, thin demo).** `(session-settled: user-directed — chosen over core-only or engine-only: domain models live in the package; demo only validates.)`
- **KD2. Own native MSE engine.** `(session-settled: user-directed — chosen over hls.js-as-engine or Shaka: package owns MediaSource/SourceBuffer; HLS helpers may parse/fetch only.)` Native HLS via `video.src` is not the engine; it is a last-resort path per KTD4/R12 when MSE cannot open.
- **KD3. Ad-cue hooks without an SDK.** `(session-settled: user-directed — chosen over no ads or full FreeWheel: preroll/midroll API surface only.)`
- **KD4. Formats: HLS VOD + live HLS + progressive MP4.** `(session-settled: user-directed — chosen over VOD-only subsets.)`
- **KD5. Captions: WebVTT / native text tracks only.** `(session-settled: user-directed — chosen over none, SRT+WebVTT, or hooks-only.)`
- **KD6. Library-first shipping bar.** `(session-settled: user-directed — chosen over portfolio-showcase-first or equal polish: demo stays thin.)`
- **KD7. Modular MSE stack.** `(session-settled: user-directed — chosen over NDP-shaped god object or engine-only spike.)`
- **KD8. Continuous play / auto-advance across playlist items is in v1.** `(session-settled: user-approved — mirrors ndp continuous-play behavior.)`
- **KD9. Safari is in scope for v1.** `(session-settled: user-directed — chosen over Chromium-only: owned MSE path on Safari where supported; documented native-HLS fallback only when MSE init fails.)`
- **KD10. External parsing/transmux helpers are allowed.** `(session-settled: user-directed — chosen over vendoring all parsers: helpers fetch/parse/transmux only; they do not own playback lifecycle.)`

### Actors

- **A1. App integrator** — consumes `@tgmc/media-player` from Nuxt or other TS apps.
- **A2. End viewer** — uses play/pause/seek/captions via host UI or thin demo controls.
- **A3. Future ad adapter** — implements against ad-cue hooks; not shipped in v1.

### Requirements

**Playback engine**

- R1. The package owns MediaSource and SourceBuffer attach/detach, append, abort, and end-of-stream lifecycle for buffered playback.
- R2. Progressive MP4 assets play without requiring HLS.
- R3. HLS VOD plays through the owned MSE path (helpers may parse/fetch manifests and segments only).
- R4. Live HLS plays through the owned MSE path, with documented v1 limits (see Planning Contract).
- R5. The player exposes play, pause, seek, load/replace asset, destroy/cleanup, and buffer/ready-state observability.
- R12. On Safari (desktop and iOS), playback works for progressive and HLS assets using the owned MSE path when the browser exposes a usable `MediaSource` or `ManagedMediaSource`; when MSE cannot be initialized for HLS, the player may fall back to native `video.src` manifest assignment and must emit a distinct playback-mode event.
- R13. V1 adaptive bitrate supports manual level selection and a default automatic variant switch using simple throughput estimates (no LL-HLS).

**Domain model**

- R6. Media asset and playlist models support current/next selection and continuous play to the next item when enabled.
- R7. A typed event surface covers load, play, pause, timeupdate (or equivalent progress), ended, error, buffer, quality/level changes, playback-mode changes, and ad-cue enter/exit where applicable.
- R8. Ad-cue hooks allow registering preroll/midroll cue points and emitting cue enter/exit events without embedding an ad SDK.

**Captions**

- R9. WebVTT tracks attach via native text tracks / `<track>`-compatible APIs; no SRT parser in v1.

**Packaging and demo**

- R10. `@tgmc/media-player` is the publishable product: typed public API, unit tests for engine and models, buildable via existing Nx/workspace scripts.
- R11. A thin `core/web` demo page loads sample assets (progressive + HLS where available), exercises playlist continuous play, and does not own domain logic.

### Key Flows

- F1. Load and play progressive MP4 — **Covered by:** R2, R5, R7, R12
- F2. Load and play HLS VOD via owned MSE — **Covered by:** R1, R3, R5, R7, R12
- F3. Live HLS — **Covered by:** R1, R4, R5, R7, R12
- F4. Continuous playlist advance — **Covered by:** R6, R7
- F5. Ad cue without SDK — **Covered by:** R8, R7

### Acceptance Examples

- AE1. Progressive play — **Covers:** R2, R5
- AE2. HLS VOD through MSE — **Covers:** R1, R3
- AE3. Continuous play — **Covers:** R6
- AE4. Ad cue emit — **Covers:** R8
- AE5. WebVTT — **Covers:** R9
- AE6. Safari HLS
  - **Covers:** R12, R3
  - **Given:** Safari with MSE support and an HLS VOD URL
  - **When:** Load then play
  - **Then:** Playback uses owned MSE append path OR emits native-hls-fallback with successful playback
- AE7. Live HLS join (fixture-driven)
  - **Covers:** R4, R1, R7
  - **Given:** A sliding-window live media playlist fixture and mocked segment fetch
  - **When:** Loader joins the live edge
  - **Then:** New media sequence appends to the engine and seek requests clamp to the seekable range

### Success Criteria

- S1. An integrator can play progressive and HLS assets from the public API without copying ndp-video-spa code.
- S2. Unit tests cover MediaSourceEngine lifecycle, playlist advance, and ad-cue emission without a browser ad SDK.
- S3. The thin demo proves F1, F2, and F4 (progressive, HLS VOD, continuous play); F3 (live HLS) is proven by AE7 and U5 tests, not the demo page.
- S4. README documents formats, live limits, Safari behavior, and ad-hook contract.

### Scope Boundaries

**In scope:** Owned MSE engine; HLS VOD/live + progressive MP4; playlist/assets/events; WebVTT; ad hooks; thin Nuxt demo; continuous play; Safari coverage.

**Deferred for later:** FreeWheel or any ad SDK adapter; SRT parsing; polished control-rack UI / NDP debug console parity; DRM; DASH; AES-128/SAMPLE-AES encrypted HLS; multi-audio renditions; LL-HLS; full ndp `setConfiguration()` parity.

**Outside this product's identity:** Recreating the full ndp-video-spa Knockout SPA as the deliverable.

### Dependencies / Assumptions

- Target browsers: current Chrome, Firefox, Edge, and Safari (desktop + iOS) per `core/web` browserslist.
- Allowed helpers (fetch/parse/transmux only): e.g. `m3u8-parser`, `mux.js` or equivalent for TS→fMP4 when playlists serve MPEG-TS; no hls.js/Shaka as engine.
- Sample streams for demo/tests are publicly reachable or fixture-based; integrators must serve HLS with CORS headers when using cross-origin manifests.
- Reference behavior comes from ndp-video-spa player/playlist/event modules; NBC-proprietary SDKs are not dependencies.

### Outstanding Questions

**Resolve Before Planning:** None.

**Deferred to Planning:** None (Q1–Q4 resolved in Planning Contract).

### Sources / Research

- Stub package: `packages/media-player` (placeholder export).
- Behavioral reference (external): ndp-video-spa `app/scripts/modules/player/baseline/base.js`, `baseline/hls.js`, playlist/asset models, player events.
- Monorepo patterns: `packages/utilities` for package exports/build; `core/web/app/pages/cdn-test.vue` for thin validation pages.

## Planning Contract

### Key Technical Decisions

- **KTD1. Layered modules.** `MediaSourceEngine` (buffer queue, append sequencing, teardown) sits below format loaders (`ProgressiveLoader`, `HlsLoader`) and above `TgmcPlayer` facade. Matches KD7.
- **KTD2. Helper boundaries.** `m3u8-parser` parses master/media playlists; segment fetch uses `fetch` + optional `mux.js` (or similar) only to produce fMP4 init/media segments for `SourceBuffer.appendBuffer`. Helpers never call `video.play()` or attach `MediaSource` themselves.
- **KTD3. Safari MSE selection.** At runtime, prefer `ManagedMediaSource` when defined (Safari), else `MediaSource`. Probe `isTypeSupported` for `video/mp4; codecs="avc1.42E01E,mp4a.40.2"` (and audio-only variants as needed) before opening buffers. On Safari, call MMS lifecycle APIs as required (`startStreaming` / streaming permission when applicable), set `playsInline` on the video element, and document minimum Safari/iOS versions in README (S4).
- **KTD4. Safari native-HLS fallback.** If HLS asset and MSE open fails after retries, assign `video.src = manifestUrl`, emit `playbackmodechange` with `native-hls-fallback`. Progressive assets must error instead of silent bypass.
- **KTD5. Live HLS v1 limits.** Sliding live edge: refresh media playlist on `EXT-X-MEDIA-SEQUENCE` advance; target ~30s buffer; seek clamped to `video.seekable` range; on `#EXT-X-DISCONTINUITY`, flush and re-append from next init segment; document that full DVR and long pause/live-lag recovery are best-effort.
- **KTD6. ABR v1.** Manual level selection API plus simple throughput-based auto switch on VOD/live (no LL-HLS parts). Default auto. Normative requirement: R13.
- **KTD7. Events.** Typed `EventTarget` or small emitter mirroring ndp event names (`load`, `play`, `pause`, `timeupdate`, `ended`, `error`, `buffered`, `levelchange`, `adcueenter`, `adcueexit`, `playbackmodechange`, `assetchange`).
- **KTD8. Demo placement.** Route `core/web/app/pages/media-player.vue`; add optional nav link in `core/web/app/components/AppPrimaryNav.vue`. Add `@tgmc/media-player` to `core/web/package.json` with `tgmc-portfolio` export condition like other workspace packages.
- **KTD9. Testing strategy.** Vitest in `packages/media-player` with mocked `MediaSource`/`SourceBuffer` for engine and loader logic; fixture m3u8/mp4 under `packages/media-player/src/fixtures/`; `environment: 'jsdom'` only where DOM `HTMLMediaElement` stubs are required. Manual Safari verification listed in Definition of Done.

### High-Level Design

```text
TgmcPlayer (facade: play/pause/seek/load/destroy, playlist, ad cues, text tracks)
  ├── PlaybackSession (state machine: idle | loading | playing | paused | ended | error)
  ├── MediaSourceEngine (MediaSource/ManagedMediaSource, SourceBuffer queue, EOS)
  ├── Loader strategy
  │     ├── ProgressiveLoader → `video.src` (v1)
  │     └── HlsLoader (m3u8-parser + segment fetch + transmux helper → engine append)
  ├── Playlist + MediaAsset models
  ├── AdCueScheduler (time-based + preroll on asset load)
  └── PlayerEventBus (typed events)
```

Reference ndp live/buffer tuning from `ndp-video-spa` `baseline/hls.js` `setConfiguration()` as starting defaults for buffer targets and retry counts, adapted to owned loader (not hls.js config passthrough). Do not port the full ndp config surface in v1.

### v1 milestones (calendar gates)

| Milestone                        | Units        | Exit signal                                |
| -------------------------------- | ------------ | ------------------------------------------ |
| M1 Engine + progressive          | U1–U3        | AE1 green; demo plays progressive MP4      |
| M2 HLS VOD (single-variant fMP4) | U4 (phase 1) | AE2 green on fixture; no ABR required      |
| M3 HLS VOD + ABR                 | U4 (phase 2) | R13 manual `setLevel` + auto switch tests  |
| M4 Live                          | U5           | AE7 green                                  |
| M5 Product surface               | U6–U9        | AE3–AE6; CI runs `@tgmc/media-player:test` |

Before U4 implementation, run a short spike (≤1 day): prove one public fMP4 HLS sample appends through owned MSE on Chromium and Safari desktop.

### Sequencing

1. U1 types + public exports
2. U2 MediaSourceEngine + mocks
3. U3 Progressive path
4. U4 HLS VOD loader
5. U5 Live HLS extensions
6. U6 Domain (playlist, events, ad cues, captions) — may run in parallel with U2–U5 after U1
7. U7 TgmcPlayer facade + continuous play
8. U8 Tests/fixtures polish + CI wiring
9. U9 Demo + workspace wiring

### Assumptions

- Nx already exposes `@tgmc/media-player:test` via `@nx/vitest`; U8 wires root CI (`scripts/test-web.sh` or `.github/workflows/ci.yml`) to run it alongside web tests.
- Demo uses public sample URLs (e.g. Apple HLS sample, Blazor/Big Buck Bunny progressive) documented in page comments.

## Implementation Units

### U1. Package skeleton and shared types

- **Goal:** Replace stub with module layout and stable public API entry.
- **Requirements:** R10
- **Files:**
  - `packages/media-player/src/index.ts`
  - `packages/media-player/src/lib/types.ts`
  - `packages/media-player/src/lib/errors.ts`
  - `packages/media-player/package.json` (dependencies for helpers)
  - `packages/media-player/README.md` (initial API outline)
- **Approach:** Export `TgmcPlayer`, `MediaAsset`, `Playlist`, event types, and configuration interfaces. Define a `PlaybackLoader` strategy interface used by progressive and HLS loaders. Add `"lib": ["ES2022", "DOM"]` (or equivalent) to `packages/media-player/tsconfig.lib.json` for MSE/DOM types. Add `m3u8-parser` and transmux helper deps to `package.json`. Follow `@tgmc/utilities` export map pattern (`tgmc-portfolio` → source).
- **Test scenarios:**
  - Public barrel exports resolve without side effects.
  - Type-only compile of consumer import shape.
- **Verification:** `npm run build --workspace=@tgmc/media-player`
- **Dependencies:** None

### U2. MediaSourceEngine

- **Goal:** Own MSE lifecycle with serialized append queue and safe teardown.
- **Requirements:** R1, R5
- **Files:**
  - `packages/media-player/src/lib/engine/media-source-engine.ts`
  - `packages/media-player/src/lib/engine/source-buffer-queue.ts`
  - `packages/media-player/src/lib/engine/mse-capability.ts` (Safari `ManagedMediaSource` probe)
  - `packages/media-player/src/lib/engine/media-source-engine.spec.ts`
  - `packages/media-player/src/lib/engine/__mocks__/media-source.ts`
- **Approach:** Open MS, add video/audio buffers by codec string, queue `appendBuffer` until `updateend`, handle `abort` + `remove` on reset, `endOfStream` on VOD complete. Expose `reset()`, `destroy()`, buffered ranges.
- **Test scenarios:**
  - Append two chunks in order; queue drains on mocked `updateend`.
  - `destroy()` detaches and clears listeners without throwing if already torn down.
  - `mse-capability` picks ManagedMediaSource when present.
- **Verification:** `npx vitest run --config packages/media-player/vitest.config.mts`
- **Dependencies:** U1

### U3. Progressive playback loader

- **Goal:** Play MP4 (and similar) without HLS.
- **Requirements:** R2, R5, R12
- **Files:**
  - `packages/media-player/src/lib/loaders/progressive-loader.ts`
  - `packages/media-player/src/lib/loaders/progressive-loader.spec.ts`
- **Approach:** V1 default for progressive MP4 is `video.src` + `load()` (not MSE append). HLS always uses the owned MSE pipeline. Emit `playbackmodechange: progressive`.
- **Test scenarios:**
  - Loader selects progressive mode for `type: 'progressive'` assets.
  - Destroy mid-load aborts fetch and does not append after teardown.
- **Verification:** vitest as above
- **Dependencies:** U2

### U4. HLS VOD loader (owned MSE)

- **Goal:** Parse m3u8, fetch segments, transmux if needed, append via engine.
- **Requirements:** R3, R1, R7, R13
- **Milestone:** Ship M2 (single-variant fMP4 VOD) before M3 (multi-variant ABR). Prefer fMP4/CMAF segments; enable TS transmux only when fixtures or sample streams require it.
- **Files:**
  - `packages/media-player/src/lib/hls/m3u8-types.ts`
  - `packages/media-player/src/lib/hls/hls-vod-loader.ts`
  - `packages/media-player/src/lib/hls/segment-fetcher.ts`
  - `packages/media-player/src/lib/hls/transmuxer.ts` (thin wrapper around allowed helper)
  - `packages/media-player/src/lib/hls/hls-vod-loader.spec.ts`
  - `packages/media-player/src/fixtures/vod/master.m3u8` (+ minimal media playlist fixture)
- **Approach:** Use `m3u8-parser` for playlists; resolve variant; fetch init + media segments; prefer fMP4/CMAF segments when available; transmux TS→fMP4 via helper only when the playlist requires it. Feed engine. Implement ABR per R13/KTD6. Native HLS fallback is orchestrated in U7, not here.
- **Test scenarios:**
  - Fixture master playlist resolves to playable variant list.
  - Mocked fetch returns init+segment bytes; engine receives ordered appends.
  - Loader reports structured failure when MSE open fails (no `video.src` assignment in U4).
- **Verification:** vitest as above
- **Dependencies:** U2

### U5. Live HLS loader

- **Goal:** Join live edge and refresh playlists per KTD5 limits.
- **Requirements:** R4, R1, R7
- **Files:**
  - `packages/media-player/src/lib/hls/hls-live-loader.ts`
  - `packages/media-player/src/lib/hls/hls-live-loader.spec.ts`
  - `packages/media-player/src/fixtures/live/media.m3u8` (sliding window fixture)
- **Approach:** Poll media playlist; append new segments; trim buffer via `remove` when over max buffer; clamp seek to seekable range.
- **Test scenarios:**
  - Fixture playlist refresh appends only new sequence numbers.
  - Seek request beyond seekable end clamps to live edge.
  - Discontinuity flag triggers buffer reset path once.
- **Verification:** vitest as above
- **Dependencies:** U4

### U6. Domain models, events, ad cues, captions

- **Goal:** Playlist/asset semantics and cross-cutting hooks from ndp patterns.
- **Requirements:** R6, R7, R8, R9
- **Files:**
  - `packages/media-player/src/lib/domain/media-asset.ts`
  - `packages/media-player/src/lib/domain/playlist.ts`
  - `packages/media-player/src/lib/domain/ad-cue.ts`
  - `packages/media-player/src/lib/domain/text-tracks.ts`
  - `packages/media-player/src/lib/events/player-event-bus.ts`
  - `packages/media-player/src/lib/domain/*.spec.ts`
- **Approach:** `MediaAsset` carries `url`, `kind: progressive | hls-vod | hls-live`, optional cues and text tracks. `Playlist` manages index + `continuousPlay`. Ad scheduler v1: fire enter/exit on registered cue times and preroll on load (no drift correction or content-stitching). Document R7 event coverage in tests: each listed event type has at least one unit test in U6 or U7.
- **Test scenarios:**
  - Playlist `next()` on ended with continuous play enabled (AE3).
  - Midroll cue at t=10s emits enter once (AE4).
  - WebVTT URL adds `TextTrack` via video element API (AE5).
- **Verification:** vitest as above
- **Dependencies:** U1

### U7. TgmcPlayer facade

- **Goal:** Single integrator-facing class wiring loaders, engine, playlist, events.
- **Requirements:** R5, R6, R7, R8, R12, R13
- **Files:**
  - `packages/media-player/src/lib/player/tgmc-player.ts`
  - `packages/media-player/src/lib/player/playback-session.ts`
  - `packages/media-player/src/lib/player/tgmc-player.spec.ts`
- **Approach:** Constructor accepts `HTMLVideoElement` + options. Methods: `load(asset)`, `loadPlaylist(playlist)`, `play`, `pause`, `seek`, `setLevel`, `destroy`. Wire continuous play on `ended`. Map ndp-like ergonomics without Knockout.
- **Test scenarios:**
  - Load progressive asset → play emits `play` event (AE1).
  - HLS VOD uses engine append path when mock MSE succeeds (AE2).
  - Simulated MSE init failure on HLS triggers KTD4 native fallback and `playbackmodechange: native-hls-fallback` (AE6).
  - `destroy()` clears timers, loader, engine, and cue listeners.
- **Verification:** vitest as above
- **Dependencies:** U3, U4, U5, U6 — U7 may ship after M2 (U3+U4 phase 1+U6) with live loader stubbed until U5 lands.

### U8. Test harness and README

- **Goal:** Reliable CI signal and integrator docs.
- **Requirements:** R10, S2, S4
- **Files:**
  - `packages/media-player/vitest.config.mts` (jsdom project or per-file environment if needed)
  - `packages/media-player/README.md`
  - Remove/replace `packages/media-player/src/lib/media-player.ts` stub
- **Approach:** Document commands, Safari notes (KTD3–KTD4), live limits (KTD5), ad-hook contract, helper deps. Add `@vitest-environment jsdom` (or a second vitest project) for U6/U7 specs that need `HTMLVideoElement`. Wire `nx run @tgmc/media-player:test` into root CI via `scripts/test-web.sh` or `.github/workflows/ci.yml`.
- **Test scenarios:**
  - Full package test suite green locally.
- **Verification:** `npx nx run @tgmc/media-player:test` or `npx vitest run --config packages/media-player/vitest.config.mts`
- **Dependencies:** U2–U7

### U9. Thin Nuxt demo

- **Goal:** Validate package from `core/web` without duplicating domain logic.
- **Requirements:** R11, S3
- **Files:**
  - `core/web/package.json` (add `@tgmc/media-player` dependency)
  - `core/web/nuxt.config.ts` (transpile/workspace alias if required)
  - `core/web/app/pages/media-player.vue`
  - `core/web/app/components/AppPrimaryNav.vue` (nav link)
- **Approach:** Client-only page (`<ClientOnly>` or dynamic import): one `<video playsinline>`, instantiate `TgmcPlayer`, buttons for play/pause, sample progressive + HLS VOD URLs, two-item playlist for continuous play. Surface `playbackmodechange` in UI or console for AE6. No business logic beyond wiring. Ensure `npm run build:libs` runs before dev when consuming workspace source.
- **Test scenarios:**
  - Manual: Chromium plays progressive + HLS VOD.
  - Manual: Safari plays progressive + HLS (owned MSE or documented fallback event in console/UI).
- **Verification:** `npm run dev` and load `/media-player`
- **Dependencies:** U7, U8

## Verification Contract

| Gate               | Command                                        | When                   |
| ------------------ | ---------------------------------------------- | ---------------------- |
| Package build      | `npm run build --workspace=@tgmc/media-player` | After U1+              |
| Package unit tests | `npx nx run @tgmc/media-player:test`           | U2–U8                  |
| Root libs build    | `npm run build:libs`                           | Before demo            |
| Web build (smoke)  | `npm run build` or `nx build @tgmc/web`        | After U9               |
| Manual Safari      | Load `/media-player` on Safari desktop + iOS   | Before calling v1 done |

CI alignment: v1 Definition of Done requires `nx run @tgmc/media-player:test` in the same CI path as web tests (extend `scripts/test-web.sh` or `.github/workflows/ci.yml` in U8).

## Definition of Done

**Global**

- All R1–R13 satisfied with traceability to units U1–U9.
- AE1–AE7 pass in automated tests where mockable; AE6 additionally verified manually on Safari desktop and iOS.
- Root CI runs `nx run @tgmc/media-player:test` (U8).
- README lists formats, helpers, Safari behavior, live limits, ad hooks.
- No hls.js/Shaka engine dependency.

**Per unit**

- U1: Public API documented; stub removed.
- U2: Engine tests green; Safari MSE probe implemented.
- U3–U5: Loader tests green with fixtures.
- U6: Playlist/cue/caption unit tests green.
- U7: Facade integration tests green.
- U8: Vitest command documented and runnable.
- U9: Demo route works in dev; nav link present.

## Appendix

### ndp-video-spa behaviors to mirror (not copy)

- HLS adapter attach/detach/load sequence: `baseline/hls.js` `bindMedia`, `loadSource`, `unbindMedia`.
- Continuous play and asset swap: `modules/player/viewmodel.js` play/pause/next patterns.
- Buffer/retry tuning starting point: `setConfiguration()` in `baseline/hls.js`.

### Resolved planning questions (from brainstorm)

| ID             | Resolution                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Q1 Safari      | KTD3–KTD4: owned MSE primary; native HLS fallback only on MSE init failure with explicit event |
| Q2 Live limits | KTD5                                                                                           |
| Q3 Helpers     | KTD2: allowed (`m3u8-parser`, transmux helper); not playback engines                           |
| Q4 Demo route  | KTD8: `/media-player` page + nav link                                                          |

### Requirement traceability (selected)

| Req                   | Primary units                                   |
| --------------------- | ----------------------------------------------- |
| R12 Safari / fallback | U2 (capability), U7 (orchestration), manual AE6 |
| R13 ABR               | U4, U7                                          |
| R4 Live HLS           | U5, AE7                                         |
