#!/usr/bin/env node
/**
 * Hard-metric harness for @tgmc/image latency/size optimization.
 *
 * Prints one JSON object to stdout:
 *   score, tests_passed, dims_ok, format_ok,
 *   transform_p50_ms, cache_hit_p50_ms, ingest_p50_ms,
 *   output_bytes, thumb_bytes, lqip_bytes, peak_rss_mb
 *
 * score = transform_p50_ms * sqrt(output_bytes / 1024)
 *       + CACHE_HIT_WEIGHT * cache_hit_p50_ms
 *       + INGEST_WEIGHT * ingest_p50_ms   (minimize)
 *
 * cache_hit path mirrors Nitro HIT: readImageCache + dims from sidecar meta
 * when present, else sharp.metadata() fallback (pre-sidecar baseline).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');
const repoRoot = join(pkgRoot, '../..');
const fixtureDir = join(pkgRoot, 'tests/fixtures');
const benchFixture = join(fixtureDir, 'bench-1600x1200.png');
const tmpDerived = join(fixtureDir, '.bench-out');
const tmpCache = join(fixtureDir, '.bench-cache');

/**
 * Weight so sub-ms HIT path still clears 5% score noise on this harness.
 * Warm sharp.metadata() is ~0.3–0.5ms; sidecar targets ~0.05ms — weight 500
 * makes that ~200-point swing (~20% of composite) without drowning cold transform.
 */
const CACHE_HIT_WEIGHT = 500;

/** Weight so ingest fusion / effort wins (~20–30% of ~90ms) clear the 5% gate. */
const INGEST_WEIGHT = 5;

const REPEAT = Number(process.env.IMAGE_BENCH_REPEAT || 5);
const WARMUP = Number(process.env.IMAGE_BENCH_WARMUP || 1);

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  return percentile(s, 50);
}

async function ensureBenchFixture() {
  mkdirSync(fixtureDir, { recursive: true });
  // Pseudo-photo noise so WebP size is meaningful (solid fills compress away).
  const width = 1600;
  const height = 1200;
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i += 3) {
    const n = (i * 1103515245 + 12345) >>> 0;
    raw[i] = 40 + (n & 0x7f);
    raw[i + 1] = 60 + ((n >>> 8) & 0x7f);
    raw[i + 2] = 90 + ((n >>> 16) & 0x7f);
  }
  const buf = await sharp(raw, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
  writeFileSync(benchFixture, buf);
  return buf;
}

/**
 * Resolve dims the same way Nitro should: prefer cache sidecar meta, else sharp.
 * @param {{ hit: boolean, buffer?: Buffer, meta?: { width?: number, height?: number } }} cached
 */
async function dimsFromCacheHit(cached) {
  if (cached.meta?.width != null && cached.meta?.height != null) {
    return { width: cached.meta.width, height: cached.meta.height, fromSidecar: true };
  }
  if (!cached.buffer) {
    return { width: 0, height: 0, fromSidecar: false };
  }
  const metaInfo = await sharp(cached.buffer).metadata();
  return { width: metaInfo.width ?? 0, height: metaInfo.height ?? 0, fromSidecar: false };
}

function failJson(extra = {}) {
  return {
    score: 1e12,
    tests_passed: 0,
    dims_ok: 0,
    format_ok: 0,
    transform_p50_ms: 1e9,
    cache_hit_p50_ms: 1e9,
    ingest_p50_ms: 1e9,
    output_bytes: 0,
    thumb_bytes: 0,
    lqip_bytes: 0,
    peak_rss_mb: 0,
    ...extra,
  };
}

async function main() {
  // Prefer built dist so experiments that only change src still need rebuild —
  // the measurement command rebuilds first.
  const build = spawnSync('npx', ['nx', 'run', '@tgmc/image:build'], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (build.status !== 0) {
    console.log(JSON.stringify(failJson({ error: 'build_failed' })));
    process.exit(0);
  }

  const { ingestImage, transformImage, writeImageCache, readImageCache, imageCacheKey } =
    await import('../dist/index.js');

  await ensureBenchFixture();
  mkdirSync(tmpDerived, { recursive: true });
  rmSync(tmpCache, { recursive: true, force: true });
  mkdirSync(tmpCache, { recursive: true });

  const transformOps = [{ type: 'resize', ops: { width: 800, fit: 'inside', withoutEnlargement: true } }];
  const transformMs = [];
  const ingestMs = [];
  const cacheHitMs = [];
  let lastTransform;
  let lastIngest;
  let lastCacheDims;
  let usedSidecar = false;

  for (let i = 0; i < WARMUP; i++) {
    await transformImage(benchFixture, transformOps, { format: 'webp', quality: 80 });
    await ingestImage(benchFixture, {
      thumbOutPath: join(tmpDerived, 'warm.thumb.webp'),
      enhanceDominant: true,
    });
  }

  for (let i = 0; i < REPEAT; i++) {
    const t0 = performance.now();
    lastTransform = await transformImage(benchFixture, transformOps, { format: 'webp', quality: 80 });
    transformMs.push(performance.now() - t0);

    const i0 = performance.now();
    lastIngest = await ingestImage(benchFixture, {
      thumbOutPath: join(tmpDerived, `iter-${i}.thumb.webp`),
      enhanceDominant: true,
    });
    ingestMs.push(performance.now() - i0);
  }

  // Seed disk cache once (miss path), then time HIT reads — Nitro sidecar frontier.
  const cacheKey = imageCacheKey('bench-1600x1200', transformOps, 'webp', 80);
  const writeMeta = lastTransform?.meta
    ? {
        width: lastTransform.meta.width,
        height: lastTransform.meta.height,
        format: lastTransform.meta.format ?? 'webp',
      }
    : undefined;
  // Optional 5th arg: experiments may accept meta for JSON sidecar; ignored if unsupported.
  await writeImageCache(tmpCache, cacheKey, 'webp', lastTransform.buffer, writeMeta);

  for (let i = 0; i < WARMUP; i++) {
    const warm = await readImageCache(tmpCache, cacheKey, 'webp');
    await dimsFromCacheHit(warm);
  }

  for (let i = 0; i < REPEAT; i++) {
    const c0 = performance.now();
    const cached = await readImageCache(tmpCache, cacheKey, 'webp');
    lastCacheDims = await dimsFromCacheHit(cached);
    cacheHitMs.push(performance.now() - c0);
    if (lastCacheDims.fromSidecar) {
      usedSidecar = true;
    }
  }

  const transform_p50_ms = median(transformMs);
  const ingest_p50_ms = median(ingestMs);
  const cache_hit_p50_ms = median(cacheHitMs);
  const output_bytes = lastTransform?.buffer?.byteLength ?? 0;
  const lastThumbPath = join(tmpDerived, `iter-${REPEAT - 1}.thumb.webp`);
  let thumb_bytes = 0;
  try {
    thumb_bytes = (await import('node:fs')).readFileSync(lastThumbPath).byteLength;
  } catch {
    thumb_bytes = 0;
  }
  // LQIP is a data URL — approximate decoded payload size from base64 segment.
  const lqip = lastIngest?.lqip ?? '';
  const lqipB64 = lqip.includes(',') ? lqip.split(',')[1] : '';
  const lqip_bytes = Math.floor((lqipB64.length * 3) / 4);

  const dims_ok =
    lastTransform?.meta?.width > 0 &&
    lastTransform?.meta?.width <= 800 &&
    lastIngest?.width === 1600 &&
    lastIngest?.height === 1200 &&
    lastCacheDims?.width === lastTransform?.meta?.width &&
    lastCacheDims?.height === lastTransform?.meta?.height
      ? 1
      : 0;
  const format_ok = lastTransform?.contentType === 'image/webp' && lastIngest?.format === 'webp' ? 1 : 0;

  const test = spawnSync('npx', ['nx', 'run', '@tgmc/image:test'], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const tests_passed = test.status === 0 ? 1 : 0;

  const cold =
    Number.isFinite(transform_p50_ms) && output_bytes > 0 ? transform_p50_ms * Math.sqrt(output_bytes / 1024) : 1e12;
  const score =
    Number.isFinite(cache_hit_p50_ms) && Number.isFinite(ingest_p50_ms) && cold < 1e12
      ? cold + CACHE_HIT_WEIGHT * cache_hit_p50_ms + INGEST_WEIGHT * ingest_p50_ms
      : 1e12;

  const peak_rss_mb = process.memoryUsage().rss / (1024 * 1024);

  try {
    rmSync(tmpDerived, { recursive: true, force: true });
    rmSync(tmpCache, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  console.log(
    JSON.stringify({
      score: Number(score.toFixed(4)),
      tests_passed,
      dims_ok,
      format_ok,
      transform_p50_ms: Number(transform_p50_ms.toFixed(3)),
      cache_hit_p50_ms: Number(cache_hit_p50_ms.toFixed(3)),
      ingest_p50_ms: Number(ingest_p50_ms.toFixed(3)),
      output_bytes,
      thumb_bytes,
      lqip_bytes,
      peak_rss_mb: Number(peak_rss_mb.toFixed(2)),
      cache_hit_weight: CACHE_HIT_WEIGHT,
      ingest_weight: INGEST_WEIGHT,
      cache_hit_used_sidecar: usedSidecar ? 1 : 0,
    })
  );
}

main().catch((err) => {
  console.log(
    JSON.stringify(
      failJson({
        error: err instanceof Error ? err.message : String(err),
      })
    )
  );
  process.exit(0);
});
