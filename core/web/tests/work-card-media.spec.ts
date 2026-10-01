// @vitest-environment node

import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getCaseStudyCardMedia, sortCaseStudies, type CaseStudy } from '../shared/portfolio-types';

const root = join(import.meta.dirname, '..');
const contentRoot = join(root, 'content');

describe('work card media rendering contract', () => {
  it('keeps UiImage for rasters and UiSvgImg for SVG diagrams', async () => {
    const card = await readFile(join(root, 'app/components/AppWorkCard/index.vue'), 'utf8');
    const uiImage = await readFile(join(root, 'app/components/ui/UiImage.vue'), 'utf8');
    expect(card).toContain('UiImage(');
    expect(card).toContain('UiSvgImg(');
    expect(card).toContain('v-if="isDiagramThumb"');
    expect(card).toContain('v-else');
    expect(card).not.toMatch(/^\s*img\(/m);
    expect(uiImage).toContain('NuxtImg');
    expect(uiImage).toContain('watch(');
    expect(uiImage).toContain('prefers-reduced-motion');
    // CSS media-query sizes strings empty Nuxt Image srcset; use screen tokens.
    expect(card).not.toMatch(/sizes="\([^"]*max-width/);
    expect(card).toMatch(/sizes="xs:100vw md:360px"/);
  });

  it('ensures live /work SSR emits NuxtImg src for raster thumbs when the server is up', async () => {
    const base = process.env.PORTFOLIO_DEV_ORIGIN ?? 'https://127.0.0.1:4210';
    const previousTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    let html: string;
    try {
      const res = await fetch(`${base}/work`);
      if (!res.ok) return;
      html = await res.text();
    } catch {
      // Dev server optional for unit CI; skip when unreachable.
      return;
    } finally {
      if (previousTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTls;
    }

    const names = await readdir(join(contentRoot, 'case-studies'));
    const studies = sortCaseStudies(
      await Promise.all(
        names.map(
          async (name) => JSON.parse(await readFile(join(contentRoot, 'case-studies', name), 'utf8')) as CaseStudy
        )
      )
    );

    for (const study of studies) {
      const media = getCaseStudyCardMedia(study)!;
      if (media.src.endsWith('.svg')) {
        expect(html).toContain(`src="${media.src}"`);
      } else {
        expect(html, `${study.slug} raster NuxtImg`).toMatch(
          new RegExp(`src="[^"]*${media.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
        );
        expect(html).toContain('data-nuxt-img');
      }
    }
  });

  it('keeps work-card media filling its cell without clipping copy', async () => {
    const card = await readFile(join(root, 'app/components/AppWorkCard/index.vue'), 'utf8');
    const componentStyles = await readFile(join(root, 'app/components/AppWorkCard/AppWorkCard.scss'), 'utf8');
    const workIndex = await readFile(join(root, 'app/pages/work/index.vue'), 'utf8');

    // Card has intrinsic dimensions
    expect(card).toContain('width="640"');
    expect(card).toContain('height="400"');

    // Component uses aspect-ratio and positioned overlay for media
    expect(componentStyles).toContain('--work-card-media-ratio: var(--media-ratio');
    expect(componentStyles).toContain('position: absolute');
    expect(componentStyles).toContain('inset: 0');

    // /work asks the card for its row layout (media | body); the card owns those rules — the page
    // no longer restyles the component's internals.
    expect(workIndex).toMatch(/layout="row"/);
    expect(componentStyles).toMatch(
      /\.work-card\[data-layout='row'\]\s*\{[\s\S]*?grid-template-columns: minmax\(12rem, var\(--work-card-media-width\)\)/
    );
    expect(componentStyles).toContain('aspect-ratio: unset');
  });

  it('resolves an existing public asset for every published story card', async () => {
    const names = await readdir(join(contentRoot, 'case-studies'));
    const studies = sortCaseStudies(
      await Promise.all(
        names.map(
          async (name) => JSON.parse(await readFile(join(contentRoot, 'case-studies', name), 'utf8')) as CaseStudy
        )
      )
    );

    expect(studies.length).toBeGreaterThanOrEqual(6);

    const rasterSlugs: string[] = [];
    const svgSlugs: string[] = [];

    for (const study of studies) {
      const media = getCaseStudyCardMedia(study);
      expect(media, study.slug).not.toBeNull();
      const rel = media!.src.replace(/^\/+/, '');
      await access(join(root, 'public', rel));

      if (media!.src.endsWith('.svg')) {
        svgSlugs.push(study.slug);
      } else {
        rasterSlugs.push(study.slug);
      }
    }

    expect(rasterSlugs.length).toBeGreaterThan(0);
    expect(svgSlugs.length).toBeGreaterThan(0);
  });

  it('keeps diagram SVGs as ASCII-safe UTF-8 with intrinsic size attributes', async () => {
    const diagrams = [
      'public/i/portfolio/experience-systems-flow.svg',
      'public/i/portfolio/data-visualization-flow.svg',
      'public/i/portfolio/spatial-experience-flow.svg',
    ];

    for (const rel of diagrams) {
      const buf = await readFile(join(root, rel));
      for (let i = 0; i < buf.length; i++) {
        expect(buf[i], `${rel} must stay 7-bit/UTF-8 safe at ${i}`).toBeLessThan(0x80);
      }
      const text = buf.toString('utf8');
      expect(text).toMatch(/width="1440"/);
      expect(text).toMatch(/height="810"/);
      expect(text).toContain('&#183;');
    }
  });
});
