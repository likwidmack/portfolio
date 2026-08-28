import { access, readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  getCaseStudyCardMedia,
  isPublicDecisionCard,
  sortCaseStudies,
  type CaseStudy,
  type DecisionCard,
} from '../shared/portfolio-types';

const contentRoot = join(import.meta.dirname, '../content');

describe('portfolio content contracts', () => {
  it('defines slug-routed case-study and privacy-reviewed decision-card collections', async () => {
    const config = await readFile(join(import.meta.dirname, '../content.config.ts'), 'utf8');
    expect(config).toContain("source: 'case-studies/*.json'");
    expect(config).toContain("source: 'decision-cards/*.json'");
    expect(config).toContain("confidentiality: z.enum(['public', 'sanitized'])");
    expect(config).toContain("privacyStatus: z.enum(['approved', 'sanitized', 'private'])");
  });

  it('publishes ordered proof stories without unsupported placeholder language', async () => {
    const names = await readdir(join(contentRoot, 'case-studies'));
    const studies = await Promise.all(
      names.map(
        async (name) => JSON.parse(await readFile(join(contentRoot, 'case-studies', name), 'utf8')) as CaseStudy
      )
    );
    expect(sortCaseStudies(studies).map((study) => study.slug)).toEqual([
      'media-systems',
      'innovation-prototyping',
      'human-controlled-ai-lab',
      'spatial-experiences',
      'data-visualization',
      'experience-systems',
    ]);
    const publicCopy = JSON.stringify(studies).toLowerCase();
    expect(publicCopy).not.toContain('stand-in');
    expect(publicCopy).not.toContain('"sample"');
    expect(publicCopy).not.toContain('hyperactivity');
  });

  it('publishes curated VIMG studies as local, captioned, optimized assets', async () => {
    const study = JSON.parse(
      await readFile(join(contentRoot, 'case-studies', 'innovation-prototyping.json'), 'utf8')
    ) as CaseStudy;
    const generatedMedia = study.media.filter((item) => item.src.startsWith('/img/portfolio/generated/'));

    expect(generatedMedia).toHaveLength(3);
    expect(generatedMedia.every((item) => item.src.endsWith('.webp'))).toBe(true);
    expect(generatedMedia.every((item) => item.caption?.startsWith('Human-directed Midjourney study'))).toBe(true);
    await Promise.all(
      generatedMedia.map((item) => access(join(import.meta.dirname, '../public', item.src.replace(/^\/+/, ''))))
    );
  });

  it('publishes two captioned VIMG motion studies without eager loading', async () => {
    const study = JSON.parse(
      await readFile(join(contentRoot, 'case-studies', 'innovation-prototyping.json'), 'utf8')
    ) as CaseStudy;
    const videos = study.media.filter((item) => item.type === 'video');

    expect(videos).toHaveLength(2);
    expect(videos.every((item) => item.src.endsWith('.mp4'))).toBe(true);
    expect(videos.every((item) => item.poster?.startsWith('/img/'))).toBe(true);
    expect(videos.every((item) => item.caption?.startsWith('Motion study'))).toBe(true);
    const videoFiles = videos.map((item) => join(import.meta.dirname, '../public', item.src.replace(/^\/+/, '')));
    const fileStats = await Promise.all(videoFiles.map((file) => stat(file)));
    expect(fileStats.every((item) => item.size < 6 * 1024 * 1024)).toBe(true);

    const renderer = await readFile(join(import.meta.dirname, '../app/components/AppCaseStudyMedia.vue'), 'utf8');
    expect(renderer).toContain('preload="none"');
    expect(renderer).toContain('playsinline');
  });

  it('fails closed for private decision cards', () => {
    const base: DecisionCard = {
      id: 'one',
      date: '2026-08-02',
      source: 'codex',
      title: 'Decision',
      promptExcerpt: 'Excerpt',
      decision: 'Decide',
      result: 'Result',
      learning: 'Learning',
      privacyStatus: 'private',
    };
    expect(isPublicDecisionCard(base)).toBe(false);
    expect(isPublicDecisionCard({ ...base, privacyStatus: 'sanitized' })).toBe(true);
    expect(isPublicDecisionCard({ ...base, privacyStatus: 'approved' })).toBe(true);
  });

  it('resolves a card thumbnail from image, poster, or diagram media', async () => {
    const names = await readdir(join(contentRoot, 'case-studies'));
    const studies = await Promise.all(
      names.map(
        async (name) => JSON.parse(await readFile(join(contentRoot, 'case-studies', name), 'utf8')) as CaseStudy
      )
    );

    for (const study of studies) {
      const cardMedia = getCaseStudyCardMedia(study);
      expect(cardMedia, `${study.slug} should expose card media`).not.toBeNull();
      expect(cardMedia?.src.startsWith('/')).toBe(true);
      expect(cardMedia?.alt.length).toBeGreaterThan(0);
      await access(join(import.meta.dirname, '../public', cardMedia!.src.replace(/^\/+/, '')));
    }

    expect(
      getCaseStudyCardMedia({
        ...studies[0],
        media: [
          { type: 'diagram', src: '/img/portfolio/media-system-flow.svg', alt: 'Diagram' },
          { type: 'image', src: '/img/portfolio/manhattan-2150-keyframe.png', alt: 'Keyframe' },
        ],
      })
    ).toEqual({
      src: '/img/portfolio/manhattan-2150-keyframe.png',
      alt: 'Keyframe',
    });
  });
});
