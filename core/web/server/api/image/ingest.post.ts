/**
 * Local ingest seam: `POST /api/image/ingest` with `{ src }` under `public/`.
 *
 * Writes thumb WebP to `public/i/_derived/` and returns LQIP + dominant color meta.
 * Production media-management will own auth + CDN storage later — this route is for local/dev.
 */
import { defineEventHandler, readBody } from 'h3';

import { runIngest, type IngestBody } from '../../utils/image-service';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as IngestBody;
  return runIngest(body ?? {});
});
