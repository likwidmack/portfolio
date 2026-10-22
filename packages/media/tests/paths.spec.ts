import { MEDIA_KINDS } from '../src/kinds.js';
import {
  CUSTOM_VARIANT,
  KIND_CODES,
  MEDIA_ROOT,
  TENANT_CODES,
  VARIANT_CODES,
  customVariantSuffix,
  originalKey,
  parseMediaKey,
  variantKey,
} from '../src/paths.js';

describe('code tables', () => {
  it('maps every kind and tenant to its code', () => {
    expect(KIND_CODES).toEqual({
      image: 'i',
      svg: 's',
      video: 'v',
      audio: 'a',
      document: 'd',
      model: 'o',
    });
    expect(TENANT_CODES).toEqual({ portfolio: 'pf', hyperactivity: 'ha' });
    expect(Object.keys(KIND_CODES).sort()).toEqual([...MEDIA_KINDS].sort());
    expect(VARIANT_CODES).toEqual(['t', '640', '1280', '1920', 'p']);
    expect(MEDIA_ROOT).toBe('m');
    expect(CUSTOM_VARIANT).toBe('custom');
  });
});

describe('originalKey', () => {
  it('builds m/{tenant}/{kind}/{name}.{ext} without a leading slash', () => {
    expect(originalKey({ tenant: 'portfolio', kind: 'image', name: 'manhattan-keyframe', ext: 'png' })).toBe(
      'm/pf/i/manhattan-keyframe.png'
    );
    expect(originalKey({ tenant: 'hyperactivity', kind: 'model', name: 'rig', ext: 'glb' })).toBe('m/ha/o/rig.glb');
    expect(originalKey({ tenant: 'portfolio', kind: 'document', name: 'resume-2026', ext: 'pdf' })).toBe(
      'm/pf/d/resume-2026.pdf'
    );
  });

  it('rejects names that are not normalized (no repeated or empty segments)', () => {
    const base = { tenant: 'portfolio', kind: 'image', ext: 'png' } as const;
    expect(() => originalKey({ ...base, name: '' })).toThrow();
    expect(() => originalKey({ ...base, name: 'Upper' })).toThrow();
    expect(() => originalKey({ ...base, name: 'a--b' })).toThrow();
    expect(() => originalKey({ ...base, name: 'a/b' })).toThrow();
    expect(() => originalKey({ ...base, name: 'a@t' })).toThrow();
    expect(() => originalKey({ ...base, name: 'a'.repeat(33) })).toThrow();
    expect(() => originalKey({ ...base, name: 'ok', ext: '' })).toThrow();
    expect(() => originalKey({ ...base, name: 'ok', ext: 'PNG' })).toThrow();
  });

  it('allows a filename of exactly 36 characters', () => {
    expect(originalKey({ tenant: 'portfolio', kind: 'image', name: 'a'.repeat(32), ext: 'png' })).toBe(
      `m/pf/i/${'a'.repeat(32)}.png`
    );
  });
});

describe('variantKey', () => {
  const original = 'm/pf/i/manhattan-keyframe.png';

  it('appends @{variant} before the extension', () => {
    expect(variantKey(original, '640', 'webp')).toBe('m/pf/i/manhattan-keyframe@640.webp');
    expect(variantKey(original, 't', 'webp')).toBe('m/pf/i/manhattan-keyframe@t.webp');
    expect(variantKey(original, '1920', 'avif')).toBe('m/pf/i/manhattan-keyframe@1920.avif');
    expect(variantKey(original, 'p', 'webp')).toBe('m/pf/i/manhattan-keyframe@p.webp');
  });

  it('supports custom variants keyed by the first 8 hex chars of the child id', () => {
    const suffix = customVariantSuffix('1a2b3c4d-1111-2222-3333-444455556666');
    expect(suffix).toBe('c-1a2b3c4d');
    expect(variantKey(original, suffix, 'webp')).toBe('m/pf/i/manhattan-keyframe@c-1a2b3c4d.webp');
  });

  it('derives a stable 8-hex suffix for ids that are not hex', () => {
    const a = customVariantSuffix('child-1');
    expect(a).toMatch(/^c-[0-9a-f]{8}$/);
    expect(customVariantSuffix('child-1')).toBe(a);
    expect(customVariantSuffix('child-2')).not.toBe(a);
  });

  it('rejects unknown variants, bad extensions, and variant keys as the original', () => {
    expect(() => variantKey(original, '800', 'webp')).toThrow();
    expect(() => variantKey(original, 'c-xyz', 'webp')).toThrow();
    expect(() => variantKey(original, 't', '')).toThrow();
    expect(() => variantKey(original, 't', 'WEBP')).toThrow();
    expect(() => variantKey('m/pf/i/a@t.webp', 't', 'webp')).toThrow();
    expect(() => variantKey('assets/x/original', 't', 'webp')).toThrow();
  });
});

describe('parseMediaKey', () => {
  it('parses an original', () => {
    expect(parseMediaKey('m/pf/i/manhattan-keyframe.png')).toEqual({
      tenant: 'portfolio',
      kind: 'image',
      name: 'manhattan-keyframe',
      ext: 'png',
      variant: null,
    });
  });

  it('parses catalog and custom variants', () => {
    expect(parseMediaKey('m/pf/i/manhattan-keyframe@640.webp')).toMatchObject({
      name: 'manhattan-keyframe',
      ext: 'webp',
      variant: '640',
    });
    expect(parseMediaKey('m/pf/i/manhattan-keyframe@t.webp')?.variant).toBe('t');
    expect(parseMediaKey('m/pf/i/manhattan-keyframe@c-1a2b3c4d.webp')?.variant).toBe('c-1a2b3c4d');
    expect(parseMediaKey('m/ha/v/tesseract-framework@p.jpg')).toMatchObject({
      tenant: 'hyperactivity',
      kind: 'video',
      variant: 'p',
    });
  });

  it('round-trips with originalKey / variantKey', () => {
    const key = originalKey({ tenant: 'portfolio', kind: 'video', name: 'tesseract-framework', ext: 'mp4' });
    const parsed = parseMediaKey(key);
    expect(parsed).not.toBeNull();
    expect(variantKey(key, '1280', 'webp')).toBe('m/pf/v/tesseract-framework@1280.webp');
  });

  it('returns null for anything that is not a media key', () => {
    for (const key of [
      '',
      'assets/a/original',
      'media/pf/i/a.png',
      '/m/pf/i/a.png',
      'm/xx/i/a.png',
      'm/pf/z/a.png',
      'm/pf/i/A.png',
      'm/pf/i/a--b.png',
      'm/pf/i/a.png/extra',
      'm/pf/i/a@800.webp',
      'm/pf/i/a@c-zz.webp',
      'm/pf/i/a.',
      'm/pf/i/.png',
      `m/pf/i/${'a'.repeat(33)}.png`,
    ]) {
      expect(parseMediaKey(key), key).toBeNull();
    }
  });
});
