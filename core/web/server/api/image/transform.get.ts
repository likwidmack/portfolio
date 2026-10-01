/**
 * On-demand image transform: `GET /api/image/transform?src=…&w=…&format=webp&ops=…`
 *
 * Serves large / manipulated variants with a disk cache under `.cache/image/`.
 * Does not replace `@nuxt/image` / IPX for ordinary static assets.
 */
import { defineEventHandler, getQuery, setHeader } from 'h3';

import { runOnDemandTransform } from '../../utils/image-service';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const result = await runOnDemandTransform({
    src: typeof query.src === 'string' ? query.src : undefined,
    w: typeof query.w === 'string' || typeof query.w === 'number' ? query.w : undefined,
    h: typeof query.h === 'string' || typeof query.h === 'number' ? query.h : undefined,
    format: typeof query.format === 'string' ? query.format : undefined,
    quality: typeof query.quality === 'string' || typeof query.quality === 'number' ? query.quality : undefined,
    ops: typeof query.ops === 'string' ? query.ops : undefined,
  });

  setHeader(event, 'Content-Type', result.contentType);
  // URL is path-keyed (src can be replaced); force revalidation rather than a day-long max-age.
  setHeader(event, 'Cache-Control', 'public, max-age=0, must-revalidate');
  setHeader(event, 'X-Image-Cache', result.cacheHit ? 'HIT' : 'MISS');
  if (result.meta.width && result.meta.height) {
    setHeader(event, 'X-Image-Width', String(result.meta.width));
    setHeader(event, 'X-Image-Height', String(result.meta.height));
  }

  return result.buffer;
});
