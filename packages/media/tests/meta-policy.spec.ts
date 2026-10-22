import { RecipeValidationError } from '../src/errors.js';
import { isNormalizedMediaFilename } from '../src/filename.js';
import {
  DEFAULT_MEDIA_CREDIT,
  assertMediaMeta,
  looksLikeIdentifier,
  normalizeMediaFilename,
  validateMediaMeta,
} from '../src/meta-policy.js';

describe('normalizeMediaFilename (policy)', () => {
  it('matches the plan examples', () => {
    expect(normalizeMediaFilename('Tamara G Mack_Resume_2026.pdf')).toBe('tamara-mack-resume-2026.pdf');
    expect(normalizeMediaFilename('vimg-tesseract-framework.mp4')).toBe('tesseract-framework.mp4');
  });

  it('strips generator prefixes, repeatedly and in any case', () => {
    expect(normalizeMediaFilename('VIMG_crystal-volume.webp')).toBe('crystal-volume.webp');
    expect(normalizeMediaFilename('mj_vimg-cosmic network.png')).toBe('cosmic-network.png');
    expect(normalizeMediaFilename('Midjourney - helix study.png')).toBe('helix-study.png');
    expect(normalizeMediaFilename('DALL-E 2026 keyframe.png')).toBe('2026-keyframe.png');
  });

  it('drops camera prefixes, UUIDs, long hex and long digit runs', () => {
    expect(normalizeMediaFilename('IMG_1234 sunset.jpg')).toBe('sunset.jpg');
    expect(normalizeMediaFilename('PXL_20240101_123456789 harbor.jpg')).toBe('harbor.jpg');
    expect(normalizeMediaFilename('hero-0f8fad5b-d9cb-469f-a165-70867728950e.png')).toBe('hero.png');
    expect(normalizeMediaFilename('cover_9f86d081884c7d65.webp')).toBe('cover.webp');
    expect(normalizeMediaFilename('frame-1696969696969.png')).toBe('frame.png');
  });

  it('keeps short numbers and ordinary single letters', () => {
    expect(normalizeMediaFilename('blue-8-cell-simple.png')).toBe('blue-8-cell-simple.png');
    expect(normalizeMediaFilename('x-ray study.png')).toBe('x-ray-study.png');
    expect(normalizeMediaFilename('Resume2026.pdf')).toBe('resume2026.pdf');
  });

  it('falls back to the mechanical slug when the policy would leave nothing', () => {
    expect(normalizeMediaFilename('IMG_1234.jpg')).toBe('img-1234.jpg');
    expect(normalizeMediaFilename('vimg.mp4')).toBe('vimg.mp4');
    expect(normalizeMediaFilename('!!!.png')).toBe('untitled.png');
  });

  it('always emits a normalized filename within 36 characters', () => {
    for (const raw of [
      'Tamara-Mack-UI-AI-Portfolio-2026.pdf',
      `${'Very Long Name '.repeat(6)}.png`,
      'vimg-crystal-binary-helix.mp4',
    ]) {
      const out = normalizeMediaFilename(raw);
      expect(isNormalizedMediaFilename(out)).toBe(true);
    }
  });
});

describe('looksLikeIdentifier', () => {
  it.each([
    '0f8fad5b-d9cb-469f-a165-70867728950e',
    'asset 9f86d081884c7d65aa',
    'IMG_1234',
    'DSC_0042',
    'vimg-tesseract-framework',
    'mj_cosmic network',
    'mj-helix',
    'MJ',
    'still from mj_helix',
    'chatcmpl-AbCdEf123456',
    'job_8c1d2e3f4a5b',
    'render 1696969696969',
    'hero-shot.png',
  ])('flags %s', (value) => {
    expect(looksLikeIdentifier(value)).not.toBeNull();
  });

  it.each([
    'Manhattan 2150 keyframe',
    'Blue eight-cell tesseract',
    'Resume 2026',
    'Tamara Mack',
    'Tamara Mack (AI-assisted)',
    'MJ Rivera portrait',
    'Portrait of MJ at the studio',
  ])('accepts %s', (value) => {
    expect(looksLikeIdentifier(value)).toBeNull();
  });
});

describe('validateMediaMeta', () => {
  const good = { title: 'Manhattan 2150 keyframe', alt: 'Futuristic Manhattan skyline at dusk' };

  it('accepts a complete image and defaults the credit', () => {
    const result = validateMediaMeta('image', good);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.meta.credit).toBe(DEFAULT_MEDIA_CREDIT);
    expect(DEFAULT_MEDIA_CREDIT).toBe('Tamara Mack');
  });

  it('keeps other meta keys and trims editorial fields', () => {
    const result = validateMediaMeta('image', { ...good, title: '  Spaced title  ', tags: ['site'] });
    expect(result.meta.title).toBe('Spaced title');
    expect(result.meta.tags).toEqual(['site']);
  });

  it('requires a 3-80 character title', () => {
    expect(validateMediaMeta('document', {}).issues).toContainEqual(
      expect.objectContaining({ field: 'title', code: 'required' })
    );
    expect(validateMediaMeta('document', { title: 'ab' }).issues).toContainEqual(
      expect.objectContaining({ field: 'title', code: 'too_short' })
    );
    expect(validateMediaMeta('document', { title: 'a'.repeat(81) }).issues).toContainEqual(
      expect.objectContaining({ field: 'title', code: 'too_long' })
    );
    expect(validateMediaMeta('document', { title: 'Resume' }).ok).toBe(true);
  });

  it('requires alt (at most 150) for image and svg only', () => {
    expect(validateMediaMeta('image', { title: 'Hero' }).issues).toContainEqual(
      expect.objectContaining({ field: 'alt', code: 'required' })
    );
    expect(validateMediaMeta('svg', { title: 'Flow' }).issues).toContainEqual(
      expect.objectContaining({ field: 'alt', code: 'required' })
    );
    expect(validateMediaMeta('image', { title: 'Hero', alt: 'a'.repeat(151) }).issues).toContainEqual(
      expect.objectContaining({ field: 'alt', code: 'too_long' })
    );
    expect(validateMediaMeta('document', { title: 'Resume' }).ok).toBe(true);
    expect(validateMediaMeta('video', { title: 'Loop' }).ok).toBe(true);
  });

  it("requires alt for a video's poster", () => {
    expect(validateMediaMeta('video', { title: 'Loop', posterId: 'abc' }).issues).toContainEqual(
      expect.objectContaining({ field: 'alt', code: 'required' })
    );
    expect(validateMediaMeta('video', { title: 'Loop', posterId: 'abc', alt: 'Spinning cube' }).ok).toBe(true);
  });

  it('caps description at 300 characters and keeps it optional', () => {
    expect(validateMediaMeta('document', { title: 'Resume', description: 'd'.repeat(301) }).issues).toContainEqual(
      expect.objectContaining({ field: 'description', code: 'too_long' })
    );
  });

  it('rejects hand-typed computed fields unless the caller computed them', () => {
    const typed = validateMediaMeta('image', { ...good, width: 100, height: 50, durationSec: 3 });
    expect(typed.issues.map((issue) => `${issue.field}:${issue.code}`)).toEqual([
      'width:computed',
      'height:computed',
      'durationSec:computed',
    ]);
    expect(validateMediaMeta('image', { ...good, width: 100, height: 50 }, { computed: true }).ok).toBe(true);
    expect(validateMediaMeta('image', { ...good, width: -1 }, { computed: true }).issues).toContainEqual(
      expect.objectContaining({ field: 'width', code: 'invalid' })
    );
  });

  it('rejects identifier-looking editorial values', () => {
    const result = validateMediaMeta('image', {
      title: 'vimg-crystal-volume',
      alt: 'IMG_1234',
      description: 'Job 0f8fad5b-d9cb-469f-a165-70867728950e',
      credit: 'a3f9c2d1e8b7a6c5d4',
    });
    expect(result.issues.filter((issue) => issue.code === 'identifier').map((issue) => issue.field)).toEqual([
      'title',
      'alt',
      'description',
      'credit',
    ]);
  });

  it('rejects non-string editorial values', () => {
    expect(validateMediaMeta('document', { title: 42 }).issues).toContainEqual(
      expect.objectContaining({ field: 'title', code: 'invalid' })
    );
  });
});

describe('assertMediaMeta', () => {
  it('returns the normalized meta when valid', () => {
    expect(assertMediaMeta('document', { title: 'Resume' }).credit).toBe('Tamara Mack');
  });

  it('throws a RecipeValidationError naming every issue', () => {
    expect(() => assertMediaMeta('image', { title: 'x' })).toThrow(RecipeValidationError);
    expect(() => assertMediaMeta('image', { title: 'x' })).toThrow(/title.*alt/s);
  });
});
