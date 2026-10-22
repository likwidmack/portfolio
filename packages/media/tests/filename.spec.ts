import {
  MAX_MEDIA_FILENAME_LENGTH,
  isNormalizedMediaFilename,
  slugMediaFilename,
  splitMediaFilename,
  suggestMediaName,
} from '../src/filename.js';

describe('slugMediaFilename (mechanical)', () => {
  it('lowercases, kebab-cases and keeps the extension', () => {
    expect(slugMediaFilename('Tamara G Mack_Resume_2026.pdf')).toBe('tamara-g-mack-resume-2026.pdf');
    expect(slugMediaFilename('Manhattan  Keyframe.PNG')).toBe('manhattan-keyframe.png');
  });

  it('is ASCII only and never leaves repeated or edge hyphens', () => {
    expect(slugMediaFilename('Café Ünïcode -- shot!!.webp')).toBe('cafe-unicode-shot.webp');
    expect(slugMediaFilename('---a___b---.png')).toBe('a-b.png');
  });

  it('strips any directory part', () => {
    expect(slugMediaFilename('C:\\media\\Some Dir\\Hero Shot.jpg')).toBe('hero-shot.jpg');
    expect(slugMediaFilename('/tmp/x/Hero Shot.jpg')).toBe('hero-shot.jpg');
  });

  it('limits the whole filename (name + dot + extension) to 36 characters', () => {
    const out = slugMediaFilename(`${'very-long-name-'.repeat(5)}.png`);
    expect(out.length).toBeLessThanOrEqual(MAX_MEDIA_FILENAME_LENGTH);
    expect(out.endsWith('.png')).toBe(true);
    expect(out).not.toMatch(/-\.png$/);
    expect(isNormalizedMediaFilename(out)).toBe(true);
  });

  it('never returns an empty name', () => {
    expect(slugMediaFilename('!!!.png')).toBe('untitled.png');
    expect(slugMediaFilename('')).toBe('untitled');
  });

  it('keeps extensionless names extensionless', () => {
    expect(slugMediaFilename('README')).toBe('readme');
  });

  it('uses the last dot as the extension separator', () => {
    expect(slugMediaFilename('archive.v2.final.glb')).toBe('archive-v2-final.glb');
  });
});

describe('splitMediaFilename / isNormalizedMediaFilename', () => {
  it('splits a normalized filename', () => {
    expect(splitMediaFilename('manhattan-keyframe.png')).toEqual({ name: 'manhattan-keyframe', ext: 'png' });
  });

  it('validates normalized filenames strictly', () => {
    expect(isNormalizedMediaFilename('manhattan-keyframe.png')).toBe(true);
    expect(isNormalizedMediaFilename('Manhattan.png')).toBe(false);
    expect(isNormalizedMediaFilename('a--b.png')).toBe(false);
    expect(isNormalizedMediaFilename('-a.png')).toBe(false);
    expect(isNormalizedMediaFilename('a@t.png')).toBe(false);
    expect(isNormalizedMediaFilename('a/b.png')).toBe(false);
    expect(isNormalizedMediaFilename('.png')).toBe(false);
    expect(isNormalizedMediaFilename('a.')).toBe(false);
    expect(isNormalizedMediaFilename(`${'a'.repeat(33)}.png`)).toBe(false);
    expect(isNormalizedMediaFilename(`${'a'.repeat(32)}.png`)).toBe(true);
  });
});

describe('suggestMediaName', () => {
  it('appends -n to the base name, keeping the whole filename within the limit', () => {
    expect(suggestMediaName('manhattan-keyframe', 'png', 2)).toBe('manhattan-keyframe-2');
    expect(suggestMediaName('manhattan-keyframe', 'png', 3)).toBe('manhattan-keyframe-3');
    const long = 'a'.repeat(32);
    const suggestion = suggestMediaName(long, 'png', 12);
    expect(suggestion.endsWith('-12')).toBe(true);
    expect(`${suggestion}.png`.length).toBeLessThanOrEqual(MAX_MEDIA_FILENAME_LENGTH);
  });
});
